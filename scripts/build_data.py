# /// script
# requires-python = ">=3.12"
# dependencies = ["pyyaml"]
# ///
"""Convertit data/*.yaml en data/*.json (lus par l'app) et vérifie la cohérence des scores."""
import json
import sys
from pathlib import Path

import yaml

DATA = Path(__file__).resolve().parent.parent / "data"


def muscle_names(muscles: dict) -> set[str]:
    names = set()
    for groups in muscles["secteurs"].values():
        for group in groups.values():
            lists = [group["muscles"]] if "muscles" in group else [v for v in group.values() if isinstance(v, list)]
            names.update(m["nom"] for items in lists for m in items)
    return names


def main() -> int:
    data = {p.stem: yaml.safe_load(p.read_text(encoding="utf-8")) for p in sorted(DATA.glob("*.yaml"))}

    errors = []
    names = muscle_names(data["muscles"])
    criteres = data["scores"]["criteres"]
    scores = data["scores"]["scores"]
    for name in sorted(names - scores.keys()):
        errors.append(f"score manquant : {name}")
    for name in sorted(scores.keys() - names):
        errors.append(f"muscle inconnu dans scores.yaml : {name}")
    for name, values in scores.items():
        for crit in criteres:
            v = values.get(crit)
            if not isinstance(v, (int, float)) or not 0 <= v <= 100:
                errors.append(f"{name} : {crit} doit être un nombre entre 0 et 100")
    if errors:
        print("\n".join(errors), file=sys.stderr)
        return 1

    exos = data["exercices"]["exercices"]
    exo_names = {ex["nom"] for ex in exos}
    for ex in exos:
        ex["materiel"] = []
    for kind, listed in data["exercices"].get("materiel", {}).items():
        for name in listed:
            if name not in exo_names:
                errors.append(f"matériel {kind} : exercice inconnu : {name}")
        for ex in exos:
            if ex["nom"] in listed:
                ex["materiel"].append(kind)
    for ex in exos:
        if not ex["materiel"]:
            errors.append(f"{ex['nom']} : matériel manquant")
    defauts = data["exercices"].get("defauts", {})
    for name in defauts.keys() - exo_names:
        errors.append(f"defauts : exercice inconnu : {name}")
    for ex in exos:
        d = defauts.get(ex["nom"])
        if not d or "series" not in d or ("reps" not in d) == ("duree" not in d):
            errors.append(f"{ex['nom']} : defauts attendus avec series, charge et reps ou duree")
        else:
            ex["defaut"] = {"charge": 0, **d}

    for prog in data["programmes"]["programmes"]:
        for name in prog["exercices"]:
            if name not in exo_names:
                errors.append(f"programme {prog['nom']} : exercice inconnu : {name}")

    covered = set()
    for ex in exos:
        for name, intensity in ex["muscles"].items():
            covered.add(name)
            if name not in names:
                errors.append(f"{ex['nom']} : muscle inconnu : {name}")
            if not isinstance(intensity, (int, float)) or not 0 <= intensity <= 100:
                errors.append(f"{ex['nom']} : intensité de {name} doit être entre 0 et 100")
    if errors:
        print("\n".join(errors), file=sys.stderr)
        return 1
    for name in sorted(names - covered):
        print(f"avertissement : aucun exercice ne travaille {name}")

    for stem, content in data.items():
        (DATA / f"{stem}.json").write_text(json.dumps(content, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
        print(f"data/{stem}.json")
    return 0


if __name__ == "__main__":
    sys.exit(main())

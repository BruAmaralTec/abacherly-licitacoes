"""Lista colecoes top-level do Firestore e contagem de docs em cada uma.
Uso: python scripts/firestore_inspect.py
"""
from google.cloud import firestore

db = firestore.Client(project="abacherly-licitacoes")

# Lista colecoes top-level
collections = list(db.collections())
print(f"Total de colecoes top-level: {len(collections)}\n")

for col in collections:
    docs = list(col.stream())
    print(f"  /{col.id}: {len(docs)} doc(s)")
    # Mostra os primeiros 3 IDs como amostra
    for d in docs[:3]:
        data = d.to_dict() or {}
        # Mostra alguns campos identificadores
        ident = []
        for key in ("nome", "name", "email", "razaoSocial", "numero", "tipo", "objeto"):
            if key in data:
                v = str(data[key])[:60]
                ident.append(f"{key}={v}")
                break
        ident_str = " | ".join(ident) if ident else ""
        print(f"      {d.id}  {ident_str}")
    if len(docs) > 3:
        print(f"      ... +{len(docs) - 3}")
    print()

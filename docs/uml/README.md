# UML da plataforma EJA

Diagramas iniciais, com as classes e os casos de uso principais. Devem acompanhar as classes e os comportamentos efetivamente implementados, conforme o enunciado do trabalho.

- [Classes — visualização](classes.svg) · [fonte PlantUML](classes.puml).
- [Casos de uso — visualização](casos-de-uso.svg) · [fonte PlantUML](casos-de-uso.puml).

`Usuario` concentra a identidade e o papel exclusivo. O perfil do licenciando é uma composição opcional, com disciplinas e disponibilidade. Cada solicitação relaciona um estudante a um perfil de licenciando; cursos e vagas são os dois catálogos consultados publicamente.

No diagrama de classes, o losango preenchido indica composição; as setas indicam as associações; os números mostram as multiplicidades. `[0..1]` indica um dado opcional. A escolaridade ausente nas vagas fornecidas é desconhecida.

Para gerar os SVGs com PlantUML instalado:

```sh
plantuml -charset UTF-8 -tsvg docs/uml/classes.puml docs/uml/casos-de-uso.puml
```

As classes usam o motor ELK para linhas ortogonais, e os casos de uso usam Smetana. Ambos dispensam Graphviz; use PlantUML 1.2024.6 ou mais recente.

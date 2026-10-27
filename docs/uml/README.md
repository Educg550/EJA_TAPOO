# UML da plataforma EJA

Diagramas iniciais, com as classes e os casos de uso principais. Devem acompanhar as classes e os comportamentos efetivamente implementados, conforme o enunciado do trabalho.

- [Classes — visualização](classes.svg) · [fonte PlantUML](classes.puml).
- [Casos de uso — visualização](casos-de-uso.svg) · [fonte PlantUML](casos-de-uso.puml).

`Usuario` é uma classe abstrata que reúne os dados comuns de identidade. `EstudanteEJA`, `Licenciando` e `Administrador` herdam dela e implementam `permissoes()`, definindo os comportamentos permitidos a cada tipo de usuário por polimorfismo. Disciplinas e disponibilidade pertencem ao licenciando. Cada solicitação relaciona um estudante a um licenciando; cursos e vagas são os dois catálogos consultados publicamente.

No diagrama de classes, o triângulo vazio aponta para a superclasse; as setas simples indicam associações; os números mostram as multiplicidades. Atributos privados usam `-` e operações públicas usam `+`. `[0..1]` indica um dado opcional. A escolaridade ausente nas vagas fornecidas é desconhecida.

Para gerar os SVGs com PlantUML instalado:

```sh
plantuml -charset UTF-8 -tsvg docs/uml/classes.puml docs/uml/casos-de-uso.puml
```

As classes usam o motor ELK para linhas ortogonais, e os casos de uso usam Smetana. Ambos dispensam Graphviz; use PlantUML 1.2024.6 ou mais recente.

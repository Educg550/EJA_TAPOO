# UML da plataforma EJA

Classes de domínio implementadas em `backend/domain.py` e casos de uso principais. Os modelos de entrada e saída HTTP e os detalhes do mapeamento SQLAlchemy ficam fora desta visão do domínio.

- [Classes — visualização](classes.svg) · [fonte PlantUML](classes.puml).
- [Casos de uso — visualização](casos-de-uso.svg) · [fonte PlantUML](casos-de-uso.puml).

`Usuario` é uma classe abstrata que reúne os dados comuns de identidade. `EstudanteEJA`, `Licenciando` e `Administrador` herdam dela e implementam `permissoes()`, definindo os comportamentos permitidos a cada tipo de usuário por polimorfismo. Disciplinas e disponibilidade pertencem ao licenciando. Cada solicitação relaciona um estudante a um licenciando; cursos e vagas são os dois catálogos consultados publicamente.

No diagrama de classes, o triângulo vazio aponta para a superclasse; as setas simples indicam associações; os números mostram as multiplicidades. `-` indica um atributo interno e `+` um membro público. `[0..1]` indica um dado opcional. A escolaridade ausente nas vagas fornecidas é desconhecida. As associações de solicitação são persistidas por `estudante_id` e `licenciando_id`, com relações ORM para recuperar os nomes dos participantes; o estado é exposto por propriedade sem setter. A escolaridade é validada pelo enum nos schemas HTTP e persistida como texto opcional; por isso não há dependência direta de `OportunidadeTrabalho` para esse enum.

Para gerar os SVGs com PlantUML instalado:

```sh
plantuml -charset UTF-8 -tsvg docs/uml/classes.puml docs/uml/casos-de-uso.puml
```

Os dois diagramas usam o motor ELK para linhas ortogonais e dispensam Graphviz; use PlantUML 1.2024.6 ou mais recente. Nos casos de uso, as ligações ocultas apenas organizam os elementos verticalmente. O título identifica o sistema delimitado pelo retângulo.

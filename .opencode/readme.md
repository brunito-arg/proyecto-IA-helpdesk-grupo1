# opencode — MCP servers (GitHub y Slack)

Este documento explica cómo funcionan los MCP (Model Context Protocol) de opencode en este proyecto: qué son, cómo se configuran, cómo se resuelven los tokens de acceso y cómo verificar que estén operativos.

## 1. Resumen

Este proyecto conecta opencode con dos servicios externos vía MCP:

| MCP | Server | Qué permite |
|---|---|---|
| `github` | `ghcr.io/github/github-mcp-server` (Docker) | Crear y listar issues del repositorio, manejar labels, etc. Lo usa el agente `github-issues` para sincronizar incidentes SOFTWARE. |
| `slack` | `slack-mcp-server` (npx) | Leer/escribir mensajes en canales de Slack (notificaciones de incidencias, etc.). |

Archivos involucrados:

- `opencode.json` — define los dos MCP servers en el bloque `mcp`.
- `.env` (raíz del proyecto, **gitignored**) — guarda los tokens: `GITHUB_PERSONAL_ACCESS_TOKEN`, `SLACK_BOT_TOKEN`, etc.
- `.opencode/plugins/dotenv.ts` — plugin local que carga `.env` e inyecta los tokens a los MCP (ver [§4](#4-la-carpeta-opencodeplugins)).
- `.opencode/agent/github-issues.md` — agente que usa el MCP `github` para crear issues.

## 2. Configuración

Ambos servers se declaran en `opencode.json`:

```json
{
  "mcp": {
    "github": {
      "type": "local",
      "command": ["docker", "run", "-i", "--rm", "-e", "GITHUB_PERSONAL_ACCESS_TOKEN", "ghcr.io/github/github-mcp-server"],
      "enabled": true,
      "environment": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "{env:GITHUB_PERSONAL_ACCESS_TOKEN}"
      }
    },
    "slack": {
      "type": "local",
      "command": ["npx", "-y", "slack-mcp-server@latest", "--transport", "stdio"],
      "enabled": true,
      "environment": {
        "SLACK_MCP_XOXB_TOKEN": "{env:SLACK_BOT_TOKEN}",
        "SLACK_MCP_ADD_MESSAGE_TOOL": "true"
      }
    }
  }
}
```

Notas:

- `type: "local"` indica que el server corre como proceso local (stdio). GitHub se ejecuta en un contenedor Docker; Slack se instala/ejecuta con npx.
- `enabled: true` arranca el server al iniciar opencode.
- El `environment` define las variables de entorno con las que se lanza cada server. El server de GitHub las pasa al contenedor con `-e GITHUB_PERSONAL_ACCESS_TOKEN`.

## 3. Cómo se resuelven los tokens (importante)

**Problema:** opencode **no lee el archivo `.env` automáticamente**. Las referencias `{env:VARIABLE}` en `opencode.json` se resuelven contra variables de entorno reales del sistema operativo. Si la variable no existe, se reemplaza por una cadena vacía. Por eso, sin un paso extra, los MCP quedarían con tokens vacíos (GitHub respondería 401, Slack no autenticaría).

**Solución:** el plugin local `.opencode/plugins/dotenv.ts` se encarga de cargar `.env` en opencode. Su flujo:

```
.env (raíz)
  │  leído por el plugin dotenv.ts
  ▼
1. init del plugin → llena process.env (solo si la variable no existe)
2. hook "config"  → escribe los tokens DIRECTAMENTE en la config de los MCP:
       github.environment.GITHUB_PERSONAL_ACCESS_TOKEN = <valor de .env>
       slack.environment.SLACK_MCP_XOXB_TOKEN          = <SLACK_BOT_TOKEN de .env>
       slack.environment.SLACK_MCP_ADD_MESSAGE_TOOL    = "true"
3. hook "shell.env" → inyecta las variables a los comandos bash del agente
  ▼
opencode arranca los MCP servers con los tokens ya resueltos
```

El paso 2 es el que importa: escribir el token directo en la config de MCP no depende del orden en que opencode resuelva `{env:...}`, así que es determinista.

Variables del `.env` usadas:

| Variable en `.env` | Se inyecta a | Uso |
|---|---|---|
| `GITHUB_PERSONAL_ACCESS_TOKEN` | MCP `github` | Autenticación contra la API de GitHub |
| `SLACK_BOT_TOKEN` | MCP `slack` (como `SLACK_MCP_XOXB_TOKEN`) | Token del bot de Slack |

## 4. La carpeta `.opencode/plugins/`

Es la carpeta de **plugins locales de opencode** a nivel proyecto. Los archivos `.js`/`.ts` que contiene se **cargan automáticamente al iniciar opencode**, sin necesidad de declararlos en `opencode.json`.

Árbol actual de `.opencode/`:

```
.opencode/
├── agent/
│   ├── clasificador.md
│   ├── github-issues.md
│   └── incident-search.md
├── plugins/
│   └── dotenv.ts        # carga .env y resuelve los tokens de MCP
├── package.json         # dependencia @opencode-ai/plugin (SDK)
└── readme.md
```

### Cómo funciona un plugin

Un plugin es una función que recibe el contexto de opencode (`project`, `client`, `directory`, `$`, etc.) y devuelve un objeto de **hooks** que se ejecutan en distintos momentos. El plugin `dotenv.ts` usa tres hooks:

| Hook | Cuándo corre | Qué hace |
|---|---|---|
| `init` (cuerpo de la función) | Al cargar el plugin, antes de arrancar los MCP | Parsea `.env` y llena `process.env` (solo si la variable no existe) |
| `config` | Al resolver la configuración | Escribe los tokens directo en `config.mcp.github.environment` y `config.mcp.slack.environment` |
| `shell.env` | En cada ejecución de comandos bash | Inyecta las variables del `.env` al entorno del shell |

### Cómo agregar otro plugin

Crear un archivo `.ts` nuevo en `.opencode/plugins/` que exporte una función plugin con los hooks que necesite. Ejemplo mínimo:

```ts
import type { Plugin } from "@opencode-ai/plugin"

export const MiPlugin: Plugin = async ({ directory }) => {
  console.log("Plugin iniciado en", directory)
  return {
    "shell.env": async (_input, output) => {
      output.env.MI_VARIABLE = "valor"
    },
  }
}
```

### Dependencias

- Los plugins locales importan el SDK desde `@opencode-ai/plugin`, declarado en `.opencode/package.json`.
- Si un plugin necesita paquetes externos, se agregan a ese `package.json` y opencode corre `bun install` automáticamente al arrancar.

### Git

`.opencode/.gitignore` ignora `node_modules`, `package.json` y `package-lock.json` de esa carpeta, pero los `.ts` de los plugins **sí se commitean**: no contienen secretos (solo la lógica de lectura de `.env`), así que es seguro compartirlos con el equipo.

## 5. Requisitos

Para que ambos MCP funcionen:

- **Docker Desktop corriendo** — el MCP `github` se ejecuta con `docker run`; si Docker está apagado, el server falla con "Connection closed".
- **PAT de GitHub** con permisos *Issues: Read & Write* en `GITHUB_PERSONAL_ACCESS_TOKEN` (`.env`). Formato `github_pat_...`.
- **`SLACK_BOT_TOKEN`** válido (formato `xoxb-...`) en `.env`.
- **Node/npx** disponible en el PATH (para el MCP `slack`).
- **opencode reiniciado** tras cambiar el plugin o el `.env` (el plugin se carga al arrancar).

## 6. Verificación

Ejecutar:

```bash
opencode mcp list
```

Resultado esperado:

```
•  ✓ github  connected
•  ✓ slack   connected
```

Significado de cada estado:

| Estado | Significado | Acción |
|---|---|---|
| `✓ connected` | El server arrancó y expuso sus tools | — |
| `✗ failed / Connection closed` | El proceso no pudo arrancar | Verificar Docker Desktop (github) o node/npx (slack) |
| `✗ failed / 401` | Arrancó pero la autenticación falló | Revisar el token en `.env` (permisos, vigencia) |
| server ausente | No está en la config o `enabled: false` | Revisar `opencode.json` |

## 7. Uso

### Invocar las tools directamente

Se puede pedir a opencode que use las tools de un MCP en el prompt:

- `Usá github para listar los issues del repo` → tools `github_*`.
- `Usá slack para mandar un mensaje a #general` → tools `slack_*`.

### Agente `github-issues`

El agente `.opencode/agent/github-issues.md` automatiza la sincronización de incidentes SOFTWARE con issues de GitHub:

1. Autentica contra el backend del helpdesk (admin por defecto).
2. `GET /api/incidents` y filtra `categoria == "SOFTWARE"` y `githubIssueUrl == null`.
3. Verifica por título (`[Helpdesk #<id>]`) que no exista ya el issue (idempotencia).
4. Crea el issue con label `software` (usando el MCP `github`).
5. Registra el enlace con `PUT /api/incidents/{id}/github-issue`.

Se ejecuta con:

```bash
opencode run --agent github-issues
```

o vía la tarea programada `scripts/sync-github-issues.ps1`.

## 8. Troubleshooting

| Síntoma | Causa probable | Solución |
|---|---|---|
| `github ✗ failed — Connection closed` | Docker Desktop apagado | Iniciar Docker Desktop y repetir `opencode mcp list` |
| `github ✗ failed — 401` | PAT inválido/vencido/sin permiso Issues | Actualizar `GITHUB_PERSONAL_ACCESS_TOKEN` en `.env` |
| `slack ✗ failed` | Token mal formado o sin permiso | Revisar `SLACK_BOT_TOKEN` (`xoxb-...`) en `.env` |
| MCP conecta pero las tools no hacen nada | Server iniciado sin los tokens (plugin no cargó) | Reiniciar opencode; verificar `.opencode/plugins/dotenv.ts` |
| `opencode: command not found` | opencode no está en el PATH | Instalar/ubicar opencode |

## 9. Seguridad

- `.env` está en `.gitignore` — **nunca** commitear tokens.
- El plugin `dotenv.ts` **no contiene secretos**: solo lee `.env` y los inyecta en tiempo de ejecución, por eso los `.ts` de `.opencode/plugins/` se pueden commitear.
- `.env.example` documenta las variables sin valores reales.
- Los MCP agregan tools al contexto de opencode: conviene mantener solo los servers que se usan (`enabled: true` solo para github y slack).

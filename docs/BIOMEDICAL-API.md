# Biomedical API Surface

Base path: `/v1/biomedical`

## Portfolio and evidence

- `POST /workspaces`
- `POST /programs`
- `POST /evidence`
- `POST /evidence/:id/review`
- `POST /claims`
- `POST /claims/:id/review`
- `POST /contradictions`
- `POST /contradictions/:id/resolve`

## Knowledge and development

- `POST /graph/nodes`
- `POST /graph/nodes/:id/review`
- `POST /graph/edges`
- `POST /graph/edges/:id/review`
- `POST /hypotheses`
- `POST /hypotheses/:id/review`
- `POST /development-plans`
- `POST /development-plans/:id/review`

## External laboratories

- `POST /laboratories`
- `POST /laboratories/:id/qualify`
- `POST /laboratory-engagements`
- `POST /laboratory-engagements/:id/transitions`

## Translation and value creation

- `POST /regulatory-pathways`
- `POST /regulatory-pathways/:id/review`
- `POST /ip-assets`
- `POST /ip-assets/:id/status`
- `POST /funding-opportunities`
- `POST /manufacturing-plans`
- `POST /commercialization-plans`
- `POST /decision-gates`
- `POST /decision-gates/:id/decide`
- `POST /decision-gates/:id/verify`

## Retrieval

- `GET /entities?type=<entity-type>&workspaceId=<id>`
- `GET /context?workspaceId=<id>&programId=<id>`
- `GET /events?workspaceId=<id>&entityId=<id>`

The API stores governed scientific and operating records. It does not directly run laboratory equipment, transfer money, sign contracts, submit regulatory filings, or issue autonomous human dosing instructions.

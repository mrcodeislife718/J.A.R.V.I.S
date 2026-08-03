# Persistent Personal Knowledge Management

## Purpose

The Personal Knowledge Management system preserves project continuity without treating every model output as trusted memory. It stores original source text separately from extracted knowledge, preserves authorship, requires review before retrieval, and produces an exact-state resume packet for each isolated workspace.

## Data model

```text
Workspace
  -> Sources (original conversations, notes, files, research, and plans)
  -> Knowledge items (candidate, approved, rejected, or superseded)
  -> Relations (supports, contradicts, depends-on, supersedes, relates-to, implements)
  -> Timeline events
  -> Resume packet
```

Original text is stored in a content-addressed blob store. PostgreSQL stores metadata, review state, provenance locations, relations, and timelines. Qdrant is optional and stores semantic vectors only; PostgreSQL remains the source of truth.

## Authorship separation

Every source and knowledge item is explicitly marked as one of:

- `user`
- `assistant`
- `external`
- `system`
- `mixed`

J.A.R.V.I.S does not infer that assistant-generated wording belongs to the user. Imported conversations should be segmented by speaker or ingested as separate sources when authorship differs.

## Knowledge categories

The first release supports:

- Concept
- Decision
- Rationale
- Correction
- Standing rule
- Unresolved question
- Next action
- Evidence
- Assumption
- Contradiction
- Project state

Each item retains its source ID, character offsets when available, confidence, evidence state, validity window, metadata, and supersession link.

## Review lifecycle

```text
Source ingestion
  -> candidate extraction
  -> human review
  -> approved or rejected
  -> optional supersession
  -> retrieval and resume eligibility
```

Only approved records can appear in search results or resume packets. Rejected and superseded records remain auditable but are excluded from active context.

## Labeled extraction

Version 0.2 performs deterministic extraction only when a source line carries an explicit label such as:

```text
Decision: Build one governed operating core.
Correction: Agent count is not a performance metric.
Standing rule: Keep projects in isolated workspaces.
Open question: Which dependency remains unresolved?
Next action: Implement durable storage.
```

This avoids silently inventing decisions from conversational prose. Model-assisted extraction can be added later behind the same candidate-review gate.

## Retrieval

Retrieval combines:

1. PostgreSQL full-text search over approved items.
2. Optional Ollama embeddings stored in Qdrant.
3. Reciprocal-rank fusion of lexical and semantic candidates.

When Qdrant or the embedding model is unavailable, lexical retrieval continues to operate. The semantic index is an acceleration layer, not the authoritative record.

## Resume packet

`GET /v1/pkm/workspaces/:id/resume` returns:

- Approved decisions
- Standing rules
- Corrections
- Unresolved questions
- Next actions
- Project state
- Contradictions
- Recent timeline events

This packet is intended to restore the exact state needed to continue a project without loading its entire history into a model context.

## Running with persistence

```bash
docker compose up -d postgres qdrant
cp .env.example .env
```

Set:

```text
PKM_STORAGE_DRIVER=postgres
PKM_SEMANTIC_INDEX=qdrant
```

Then run:

```bash
npm install
npm run migrate
npm run dev
```

For a zero-setup development session, keep `PKM_STORAGE_DRIVER=memory` and `PKM_SEMANTIC_INDEX=disabled`.

## Current boundaries

Version 0.2 does not yet provide:

- Multi-user authentication or authorization
- Encrypted object storage
- Automatic file parsing for PDF, DOCX, email, or image attachments
- Background ingestion queues
- Learned reranking models
- Cross-workspace transfer approval workflows
- Regulated-data certification

Do not expose the service to an untrusted network until authentication, tenancy, rate limiting, and deployment-specific security controls are added.

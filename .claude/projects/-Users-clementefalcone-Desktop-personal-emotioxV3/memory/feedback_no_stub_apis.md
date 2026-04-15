---
name: No stub APIs without dependencies
description: Never create API endpoints that depend on files/models/services that don't exist yet
type: feedback
---

Never enable API endpoints that depend on resources (models, files, external services) that aren't available. If a dependency doesn't exist, either get it first or don't wire the endpoint.

**Why:** User got a prediction endpoint stuck in infinite "processing" loop because the ONNX model file didn't exist on the server. Fire-and-forget pattern with silent failures makes debugging impossible.

**How to apply:** Before adding any endpoint that depends on an external resource (model file, binary, service), verify the resource exists. If it doesn't, get it first. Also always store error state so status endpoints can report failures instead of hanging.

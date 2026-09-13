# Analytical laboratory

Shared language for the pharmaceutical analytical laboratory workflow.

## Language

**Sample**: A received portion of material identified by a laboratory number and linked to a client and batch.
_Avoid_: Specimen, submission

**Batch**: A client-supplied identifier for the material's manufacturing lot. Multiple samples may refer to one batch.
_Avoid_: Sample number

**Test**: One analytical determination requested for a sample under a specified method and acceptance limits.
_Avoid_: Analysis job

**Result**: A recorded numerical observation for a test, with its unit, analyst, and supporting reference.
_Avoid_: Report

**Specification**: The acceptance limits associated with a test. A sample retains the limits assigned when it was received.
_Avoid_: Target

**Review**: An independent examination of submitted results, resulting in approval or a return for correction.
_Avoid_: Batch release

**Exception**: A result outside its assigned specification requiring investigation before routine approval can continue.
_Avoid_: Automatic failure disposition

**Activity record**: A chronological record of a workflow action, its actor, timestamp, and associated changes.
_Avoid_: Electronic signature

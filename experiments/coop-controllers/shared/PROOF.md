# Exact BCF guard proof

`prove_bogus.py CHAMBER_DIRECTORY` validates each chamber's frozen PE against
its retained IR, compiler assembly, audit-label map and COFF-to-PE audit, then
writes `evidence/bogus-proof.json.gz`. Adding `--check` recomputes the result
without writing. It requires `requirements-analysis.txt`. No previous workspace
is imported, modified, or required at runtime.

The installed compiler is the wwh1004 OLLVM-16 Clang 16.0.6 release executable
with SHA-256 `0d0392508af664396606f4e006922e57573690272a4e5a39f7e60e6543b710be`.
The shared `ollvm_source/` snapshot retains exact pass code, PRNG and plugin
implementation, its license, hashes, source revision, and release-tag provenance.
This is a source/installed-release identity chain; it is not a reproducible
bootstrap proof that the executable was compiled from this source checkout.

For each altered clone, the proof checks the two corresponding opaque branches
in frozen SSA IR and their exact native instructions and direct targets. The
native sequence computes the low 32 bits of `x*(x-1)`, masks bit zero, evaluates
equality with zero, combines this Boolean with signed `y<10`, then tests bit zero
and executes JNE. The false arm jumps to the clone. There are no overflow flags
on the IR multiplication/subtraction that would turn wraparound into poison.

For every independently loaded 32-bit x and y, consecutive integers have
opposite parity. Modulo 2^32 preserves bit zero, so the parity comparison is
always true. SETE therefore produces AL=1; SETL produces CL=0 or CL=1. OR keeps
AL=1; TEST AL,1 clears ZF; JNE takes the real successor. Z3 bit-vector checks
independently reject a false-arm counterexample and check signed-comparison flag
and IR/native equivalence. This does not assume the globals remain zero.

The producer and independent standard-library `verify_proof.py` check actual PE
bytes, IR labels, native targets, complete clone ranges and direct incoming
transfers. Only the two false-arm trampolines may enter a clone; no static
branch/call may enter its interior or bypass part of a guard. Physical
fallthrough into a clone is rejected. Clones return to their corresponding
original block. Retained non-execution is checked separately and does not
establish infeasibility. Shared checkers derive counts from each specimen.

The proof assumes normal entry through `bn_evaluate`, intact code and x86-64
semantics, successful global loads, ordinary call/return behavior, and no
external jump, debugger/exception redirection, or corrupted return address into
an interior block. It proves clone unreachability under those assumptions,
not whole-program equivalence for arbitrary pointers, concurrent mutation,
hardware faults, or server event/timer behavior.

`verify_proof.py` is called by the portable verifier and uses only Python's
standard library. It checks recorded UNSAT results, then independently applies
the universal parity argument to the exact retained native byte pattern. It
does not rerun Z3, rebuild a binary, execute Windows code, or assert historical
execution based solely on JSON. Ignored COFF objects are required to repeat the
original relocation audit; portable verification checks its retained evidence
and the final IR/assembly/map/PE chain without those objects.

Any clone output-assignment description is static resemblance from the retained
typed IR. It is never an executed output event or a mapping to an authored game
platform. Candidate ranking, when present, is presentation metadata only.

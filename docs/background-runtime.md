# Request waiting and shutdown

The daemon waits for its Unix/TCP listeners without an idle timeout. SIGTERM
and SIGINT are blocked only while testing the stop flag and atomically
unblocked by ppoll. This keeps a stop delivered immediately before waiting
from being lost. Client handling retains normal signal delivery and its
existing I/O deadlines.

The request-wait test exercises an already-requested stop, a real listener
wakeup after more than one second, and signal interruption with mask recovery.
Device validation must also check idle stop/restart and authenticated requests.

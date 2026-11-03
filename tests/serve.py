# Serves the site for local checks with caching turned off, so the checks
# always see the files as they are on disk. Listens on every interface so a
# phone on the same network can open the site too.
#
#   python3 tests/serve.py 4173

import http.server
import os
import sys


class NoStore(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()


class Server(http.server.ThreadingHTTPServer):
    # The default listen backlog is 5. A page opens a dozen module scripts at
    # once, and when the machine is busy the server falls behind accepting
    # them, so the extras were reset. One missing module stops js/main.js from
    # running at all, and the checks then failed at random (menu, gate, tabs).
    request_queue_size = 128


if __name__ == '__main__':
    os.chdir(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 4173
    Server(('', port), NoStore).serve_forever()

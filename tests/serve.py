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


if __name__ == '__main__':
    os.chdir(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 4173
    http.server.ThreadingHTTPServer(('', port), NoStore).serve_forever()

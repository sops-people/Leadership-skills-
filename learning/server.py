"""Local web server for the learning path screen.

Run from the repo root:  python3 -m learning.server
Then open http://localhost:8000
"""
import json
import os
import sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

from . import path, progress

STATIC = os.path.join(os.path.dirname(__file__), "static")

# Until Darko's gap report is live, every user gets the sample report.
GAP_REPORT_FILE = os.environ.get("GAP_REPORT", "sample_gap_report.json")


def learning_path(refresh=False):
    report = path.load_json(GAP_REPORT_FILE)
    taxonomy = path.load_json("taxonomy.json")
    state = progress.load(report["user_id"])
    result = path.build_path(report, taxonomy, state["feedback"], refresh)
    for step in result["steps"]:
        sid = step["skill_id"]
        step["status"] = state["skills"].get(sid, "not_started")
        item_states = state["items"].get(sid, {})
        for item in step["items"]:
            item["status"] = item_states.get(item["item_id"], "not_started")
            item["votes"] = state["feedback"].get(item["item_id"], {})
    result["reassessment"] = progress.reassessment(report["user_id"], report["generated_at"])
    return result


class Handler(BaseHTTPRequestHandler):
    def _send(self, code, body, ctype="application/json"):
        data = body if isinstance(body, bytes) else json.dumps(body).encode()
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):
        url = urlparse(self.path)
        if url.path in ("/", "/index.html"):
            with open(os.path.join(STATIC, "index.html"), "rb") as f:
                return self._send(200, f.read(), "text/html; charset=utf-8")
        if url.path == "/api/path":
            refresh = parse_qs(url.query).get("refresh") == ["1"]
            return self._send(200, learning_path(refresh))
        self._send(404, {"error": "not found"})

    def do_POST(self):
        length = int(self.headers.get("Content-Length", 0))
        body = json.loads(self.rfile.read(length) or b"{}")
        user_id = path.load_json(GAP_REPORT_FILE)["user_id"]
        try:
            if self.path == "/api/progress/skill":
                progress.set_skill_status(user_id, body["skill_id"], body["status"])
            elif self.path == "/api/progress/item":
                progress.set_item_status(user_id, body["skill_id"], body["item_id"], body["status"])
            elif self.path == "/api/feedback":
                progress.vote(user_id, body["item_id"], bool(body["useful"]))
            else:
                return self._send(404, {"error": "not found"})
        except (KeyError, ValueError) as exc:
            return self._send(400, {"error": str(exc)})
        self._send(200, {"ok": True})

    def log_message(self, fmt, *args):
        sys.stderr.write("%s\n" % (fmt % args))


def main():
    port = int(os.environ.get("PORT", 8000))
    print("Learning path running at http://localhost:%d" % port)
    ThreadingHTTPServer(("127.0.0.1", port), Handler).serve_forever()


if __name__ == "__main__":
    main()

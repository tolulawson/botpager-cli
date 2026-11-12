import argparse
import hashlib
import json
from pathlib import Path
import subprocess
import time

expected = json.loads(Path("out/deployment.json").read_text())
parser = argparse.ArgumentParser()
parser.add_argument("--origin", default="https://docs.botpager.reostack.com")
origin = parser.parse_args().origin.rstrip("/")
paths = {"index.html": "/", "quick-start/index.html": "/quick-start/", "reference/send/index.html": "/reference/send/", "_pagefind/pagefind.js": "/_pagefind/pagefind.js"}
def fetch(path):
    return subprocess.check_output(["curl", "--fail", "--silent", "--show-error", "--max-time", "20", origin + path + "?verify=" + expected["revision"]], stderr=subprocess.PIPE)

last_error = ""
for attempt in range(24):
    try:
        manifest = json.loads(fetch("/deployment.json"))
        assert manifest == expected, "Deployment manifest does not match this build"
        for path, digest in expected["files"].items():
            assert hashlib.sha256(fetch(paths[path])).hexdigest() == digest, "Asset mismatch: " + path
        print("PASS: live docs revision, homepage, Quick start, command reference and search asset match this build")
        break
    except (subprocess.CalledProcessError, AssertionError, ValueError) as error:
        last_error = str(error)
        if attempt == 23:
            raise SystemExit("Live deployment verification failed: " + last_error)
        time.sleep(5)

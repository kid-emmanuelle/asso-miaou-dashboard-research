import webbrowser
import http.server
import socketserver
import os

# Set the port
PORT = 8000

# Change directory to the project root
os.chdir(os.path.dirname(os.path.abspath(__file__)))

# Create the server
Handler = http.server.SimpleHTTPRequestHandler
httpd = socketserver.TCPServer(("", PORT), Handler)

# Open the browser automatically
webbrowser.open(f'http://localhost:{PORT}')

print(f"Serving at http://localhost:{PORT}")

# Start the server
httpd.serve_forever()
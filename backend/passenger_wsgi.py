#!/usr/bin/env python3
"""
Passenger WSGI entry point for Node.js application
This file tells Passenger how to start the Node.js backend
"""

import os
import sys

# Set the application root directory
app_root = os.path.dirname(os.path.abspath(__file__))
os.chdir(app_root)

# Set Node.js version (adjust if needed)
node_version = "24.12.0"

# Path to Node.js binary (cPanel usually has it in .nvm)
node_path = os.path.expanduser(f"~/.nvm/versions/node/v{node_version}/bin/node")

# If .nvm path doesn't exist, try system Node.js
if not os.path.exists(node_path):
    node_path = "/usr/bin/node"

# Path to the compiled server
server_path = os.path.join(app_root, "dist", "server.js")

# If dist/server.js doesn't exist, try TypeScript version
if not os.path.exists(server_path):
    server_path = os.path.join(app_root, "src", "server.ts")
    # Use tsx to run TypeScript directly
    if os.path.exists(os.path.join(app_root, "node_modules", ".bin", "tsx")):
        node_path = os.path.join(app_root, "node_modules", ".bin", "tsx")

# Passenger configuration
import passenger_wsgi

def application(environ, start_response):
    """
    Passenger WSGI application entry point
    This is called by Passenger to start the Node.js application
    """
    # Set environment variables from Passenger
    for key, value in environ.items():
        if key.startswith('PASSENGER_') or key.startswith('HTTP_'):
            os.environ[key] = value
    
    # Start the Node.js application
    # Passenger will handle the actual process management
    return passenger_wsgi.application(environ, start_response)

# Alternative: Direct Node.js execution
# Uncomment if the above doesn't work
"""
import subprocess
import sys

def application(environ, start_response):
    # Set environment
    env = os.environ.copy()
    env.update({
        'NODE_ENV': 'production',
        'PORT': environ.get('PASSENGER_PORT', '3000'),
    })
    
    # Start Node.js process
    process = subprocess.Popen(
        [node_path, server_path],
        env=env,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE
    )
    
    # Return response (Passenger will handle this)
    status = '200 OK'
    headers = [('Content-Type', 'text/plain')]
    start_response(status, headers)
    return [b'Node.js application started']
"""

# FinPulse backend image
#
# Both Node.js (Express server) and Python 3 (yfinance data scripts) are
# needed in the same container because the server spawns Python child processes
# to fetch stock data from Yahoo Finance. They share a single image to keep
# deployment simple and avoid the overhead of a separate sidecar.

FROM node:22-slim

# Install Python 3 and pip from the Debian package manager.
# --no-install-recommends keeps the layer small.
RUN apt-get update && \
    apt-get install -y --no-install-recommends python3 python3-pip && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy dependency manifests first so Docker can cache the install layers.
COPY requirements.txt ./

# --break-system-packages is required on Debian 12+ where pip is managed by
# the OS and refuses to install into the global site-packages without the flag.
RUN pip3 install --break-system-packages -r requirements.txt

COPY package.json ./
RUN npm install --omit=dev

# Copy the rest of the source (scripts/, src/).
COPY . .

# Tell runPython.js to use the system Python that has our deps installed.
ENV PYTHON_BIN=python3

EXPOSE 4000

CMD ["node", "src/server.js"]

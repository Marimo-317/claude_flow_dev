# Use Node.js 20 as the base image
FROM node:20-bullseye

# Set the working directory
WORKDIR /workspace

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git \
    curl \
    wget \
    vim \
    nano \
    zsh \
    fzf \
    ripgrep \
    jq \
    unzip \
    build-essential \
    python3 \
    python3-pip \
    python3-venv \
    iptables \
    net-tools \
    sudo \
    && rm -rf /var/lib/apt/lists/*

# Install Oh My Zsh for better shell experience
RUN sh -c "$(curl -fsSL https://raw.github.com/ohmyzsh/ohmyzsh/master/tools/install.sh)" || true

# Set up user permissions for iptables
RUN usermod -aG sudo node
RUN echo "node ALL=(ALL) NOPASSWD: /sbin/iptables, /sbin/ip6tables, /usr/bin/iptables-save, /usr/bin/ip6tables-save" >> /etc/sudoers

# Install global npm packages
RUN npm install -g \
    typescript \
    ts-node \
    nodemon \
    prettier \
    eslint \
    @types/node

# Install Python packages
RUN pip3 install \
    black \
    pylint \
    flake8 \
    requests \
    beautifulsoup4

# Set up zsh as default shell
RUN chsh -s /bin/zsh node

# Create necessary directories
RUN mkdir -p /home/node/.ssh /home/node/.config
RUN chown -R node:node /home/node

# Switch to node user
USER node

# Set up zsh configuration
RUN echo 'export PATH="$HOME/.local/bin:$PATH"' >> /home/node/.zshrc
RUN echo 'alias ll="ls -la"' >> /home/node/.zshrc
RUN echo 'alias la="ls -la"' >> /home/node/.zshrc
RUN echo 'alias l="ls -l"' >> /home/node/.zshrc

# Set default shell to zsh
SHELL ["/bin/zsh", "-c"]

# Expose common development ports
EXPOSE 3000 8000 8080 5000

# Keep container running
CMD ["tail", "-f", "/dev/null"]
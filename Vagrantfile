# -*- mode: ruby -*-
# vi: set ft=ruby :

Vagrant.configure(2) do |config|

  config.vm.box = "ubuntu/trusty64"
  
  config.vm.network :private_network, :auto_network => true
  
  config.vm.synced_folder "./", "/home/vagrant/Code"

  config.vm.provider "virtualbox" do |vb|
    vb.memory = "1024"
  end


  ############################################################
  # Basic deps

  config.vm.provision :shell, inline: <<-SHELL
    apt-get install -y git
    apt-get install -y redis-server
  SHELL

  ############################################################

  ############################################################
  # Installing node

  config.vm.provision :shell, inline: <<-SHELL
    apt-get install -y build-essential
    curl -sL https://deb.nodesource.com/setup_5.x | bash -
    apt-get install -y nodejs
  SHELL

  ############################################################
  
  ############################################################
  # Installing global npm dependencies

  config.vm.provision :shell, inline: "npm install -g mocha"

  ############################################################


  ############################################################
  # Installing local npm dependencies

  config.vm.provision :shell, privileged: false, inline: <<-SHELL
    cd /home/vagrant/Code
    npm install
  SHELL

  ############################################################
  
   
  ############################################################
  # Copy git-commit hook to prevent vagrant ssh based commits

  config.vm.provision :shell, privileged: false, inline: <<-SHELL
    cp /home/vagrant/Code/vagrant-scripts/assets/pre-commit /home/vagrant/Code/.git/hooks/pre-commit
    chmod ug+x /home/vagrant/Code/.git/hooks/*
  SHELL

  ############################################################

  ############################################################
  # Oh My ZSH Install section
  
  config.vm.provision :shell, inline: "apt-get -y install zsh"

  config.vm.provision "shell", privileged: false, inline: <<-SHELL
    set +e
    curl -OL https://raw.github.com/robbyrussell/oh-my-zsh/master/tools/install.sh
    bash install.sh
    set -e
    cp ~/.oh-my-zsh/templates/zshrc.zsh-template ~/.zshrc
    sed -i 's/ZSH_THEME="robbyrussell"/ZSH_THEME="agnoster"/g' ~/.zshrc
  SHELL


  # Change the vagrant user's shell to use zsh
  config.vm.provision :shell do |shell|
    shell.inline = "sudo chsh -s /usr/bin/zsh vagrant"
  end

  ############################################################

end

FROM mysql:latest

RUN echo 'debconf debconf/frontend select Noninteractive' | debconf-set-selections
RUN apt-get update && apt-get install -qq -y --no-install-recommends apt-utils locales build-essential libaio1 \
 zip unzip iptables iputils-ping telnet wget curl vim net-tools sudo ca-certificates

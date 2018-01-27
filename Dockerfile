FROM golang:1.9

#Setting up SSH
#RUN mkdir /root/.ssh/
#COPY /Users/anton/.ssh/id_rsa.pub /root/.ssh/id_rsa.pub
#there should be an id_rsa
#RUN ls ~/.ssh
#RUN cat ~/id_rsa.pub >> ~/.ssh/authorized_keys
#RUN cat ~/.ssh/authorized_keys
#WORKDIR instruction sets the working directory for any RUN/CMD/ENTRYPOINT/COPY/ADD`
WORKDIR /go/src/github.com/varunpatro/cinnabot 
#Copies files from src and add it to dst
RUN pwd
#Should return nothing.
RUN ls
#Copies files from current directory into container's work dir
COPY . .
RUN ls -la

#Download the packages named by the import path "./..." along with their dependencies
RUN go get ./...


#There should be an executable called main here
#Okay there isnt. Which means go build does things normally. I should run go build from main 
RUN ls -la



WORKDIR /go/src/github.com/varunpatro/cinnabot/main
RUN go build
RUN ls -la

# From current work directory, search for the executable "main" and run it. 
# Provides defaults for the executing container.
CMD ["main"]

EXPOSE 8080


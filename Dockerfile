FROM golang:1.9

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

#Install builds the binaries of all these packages (Not sure if I want it) and places it in /go/bin/
#RUN go install ./...


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


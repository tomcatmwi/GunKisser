@echo off
echo This batch file generates new SSL keys with OpenSSL
echo Press Ctrl-C now if you don't need new keys!
pause

cls
echo STEP 1
openssl genrsa -des3 -out server.enc.key 2048
pause

cls
echo STEP 2
openssl req -new -key server.enc.key -out server.csr
pause

cls
echo STEP 3
openssl rsa -in server.enc.key -out server.key
pause

cls
echo STEP 4
set RANDFILE=.rnd
openssl x509 -req -days 365 -in server.csr -signkey server.key -out server.crt
del *.rnd
pause

# vhosts
## wamp apache commands

## tags
### 05esp_pi_sb-hp_ssl
Re-did the self signed certificates in a way that created a [ca signing authority](https://wiki.sitebuilt.net/index.php?title=Openssl#creating_a_certificate_signing_authority_ca_.28and_cert_and_key.29) that the node clients can use. 

#### related repositories/machines
https://github.com/mckennatim/pi2_iot_services
https://github.com/mckennatim/sb_vhosts_services
pi2, services.sitebuilt.net



### 04pi-esp_pi-vhost-wssHp
2. esp8266<->piMoscaBroker<->devClient-piNodeProxy-serverClient<-->serverMoscaBrokerTls<-->webClient

**esp8266** = C:\wamp\vhosts\ssl\sb2\geniot\esp8266\test\clientMQTT\clientMQTT.ino
**piMoscaBroker** = /home/iot/services/serverpi/basicMQTT.js
**devClient** = /home/iot/services/serverpi/piClientMQTT.js
**piNodeProxy** = NOT DONE TODO
**serverClient** = pi2://home/iot/services/serverpi/hpClientMQTT.js or sbClientMQTT.js
**serverMoscaBrokerTls** = C:\wamp\vhosts\ssl\sb2\geniot\server\servertest\basicsMQTTsl.js OR sitebuilt.net://home/services/serverpi/basicsMQTTsl.js
**webClient** = C:\wamp\vhosts\ssl\sb2\geniot\client\raw\basicMQTTwssHP.html or basicMQTTwssSB.html

#### Weird notes on connecting to broker basicsMQTTsl.js on hp
The node client only connects with: 

    piClient = mqtt.connect('wss://10.0.1.100:2013', {rejectUnauthorized: false});
while the webclient only works with 

    client = mqtt.connect('wss://sslvh.tm:2013', {rejectUnauthorized: false})

### 03mosca_wss
esp8266
  C:\wamp\vhosts\ssl\sb2\geniot\esp8266\test\clientMQTT\clientMQTT.ino
server
  C:\wamp\vhosts\ssl\sb2\geniot\server\servertest\basicsMQTTsl.js 
   or
  sitebuilt.net/home/services/serverpi/basicsMQTTsl.js
webclients
  C:\wamp\vhosts\ssl\sb2\geniot\client\raw\basicMQTTwssHP.html or basicMQTTwssSB.html


Have given up on making a lightweight encryption work from esp8266 to node mosca server. Once you gear up and have the esp8266 both publish AND subscribe to a web client, the shit goes south.

####Options
1. esp8266<->piMoscaBroker<->devClient-piNodeProxy-serverClient<--> serverMoscaBrokerTLS
2. esp8266<->piMoscaBroker<->devClient-piNodeProxy-serverClient<--> serverNginxTcpTLS->serverMoscaBroker
3. esp8266<->piNginxTCPfproxyTLS<--> serverNginxTCPrproxyTLS->serverMoscaBroker

Option 3 is the preferred clean option but so far can neither forward nor reverse proxy MQTT. Option 2 would still allow all MQTT development to be w/o TLS concerns although `MoscaSettings.allowNonSecure: true` would still let nonTLS Mqtt in. Option 1 is the one in play now that wss works on mosca. So what is TODO is the piMoscaBroker<->devClient-piNodeProxy-serverClient bit.

Maybe start with piMoscaBroker


### 02main.ino_node_tls
https://wiki.sitebuilt.net/index.php?title=Tls_on_esp8266 has the notes on making a lightweight encryption work from esp8266 to node mosca server.

### 01clientmqttssl_basicssl
{"pid":5768,"hostname":"tim-hp","name":"mosca","level":40,"time":1484804098536,"msg":"101057795:error:14094410:SSL routines:ssl3_read_bytes:sslv3 alert handshake failure:openssl\\ssl\\s3_pkt.c:1472:SSL alert number 40\n","type":"Error","stack":"Error: 101057795:error:14094410:SSL routines:ssl3_read_bytes:sslv3 alert handshake failure:openssl\\ssl\\s3_pkt.c:1472:SSL alert number 40\n\n    at Error (native)","client":"ESP8266Client-e1e","v":1}


With vhosts/ssl/sb2/geniot/esp8266/clientmqttssl and vhosts/ssl/sb2/geniot/server/servertest/basicssl.js, finally have a secure server running a secure node mqtt broker talking to an esp8266 device using WiFiClientSecure, pubsubclient and a sha1 fingerprint for tls1.1 encrypted mqtt packets.

On the server it seems adding this to settings       

    secure : {
        port: 8883,
        keyPath: SECURE_KEY,
        certPath: SECURE_CERT,
      }
forces the server to encrypt and unencrypt mqtt data.

For the client, instead of `WiFiClient espClient;` import `#include <WiFiClientSecure.h>` and use `WiFiClientSecure espClient;`

Change the port  `const int sslport = 8883;` and include the fingerprint
`const char* fingerprint = "b1 25 c9 de 52 a3 4d 5f 16 f5 c5 6a cf 9a 65 e0 b5 f9 98 d7";`.  

In the `reconnect()`, as soon as you connect verify the fingerprint and then `publish/subscribe`

    if (client.connect(clientId.c_str())) {
      Serial.println("connected");
      if (espClient.verify(fingerprint, mqtt_server)) {
        Serial.println("certificate matches");
      } else {
        Serial.println("certificate doesn't match");
      }
      delay(1000)
      client.publish("fromDevice", "hello world");
      client.subscribe("fromBroker");

the server

    var mosca = require('mosca')
    var SECURE_KEY='../../../../../somecerts/webserver.key'
    var SECURE_CERT='../../../../../somecerts/webserver.crt';
    var ascoltatore = {
      //using ascoltatore
      type: 'mongo',        
      url: 'mongodb://localhost:27017/mqtt',
      pubsubCollection: 'ascoltatori',
      mongo: {}
    };
    var moscaSettings = {
      backend: ascoltatore,
      persistence: {
        factory: mosca.persistence.Mongo,
        url: 'mongodb://localhost:27017/mqtt'
      },
      secure : {
        port: 8883,
        keyPath: SECURE_KEY,
        certPath: SECURE_CERT,
      }   
    };
    var server = new mosca.Server(moscaSettings);
    server.on('ready', setup);
    server.on('clientConnected', function(client) {
        console.log('client connected', client.id);
        setInterval(function () { 
          server.publish({topic: 'fromBroker', payload: 'one message from broker'}, function(){
            console.log('sent message')
          })
        }, 4000);          
    });
    server.on('published', function(packet, client) {
      console.log('Published', packet.payload.toString());
    });
    function setup() {
      console.log('Mosca server is up and running')
    }

the client

    #include <ESP8266WiFi.h>
    #include <PubSubClient.h>
    #include <WiFiClientSecure.h>
    const char* ssid = "CenturyLink6185";
    const char* password = "jamesett";
    const char* mqtt_server = "192.168.0.26";
    const int sslport = 8883;
    const char* fingerprint = "b1 25 c9 de 52 a3 4d 5f 16 f5 c5 6a cf 9a 65 e0 b5 f9 98 d7";
    WiFiClientSecure espClient;
    PubSubClient client(espClient);
    long lastMsg = 0;
    char msg[50];
    int value = 0;
    void setup_wifi() {
      delay(10);
      // We start by connecting to a WiFi network
      Serial.println();
      Serial.print("Connecting to ");
      Serial.println(ssid);
      WiFi.begin(ssid, password);
      while (WiFi.status() != WL_CONNECTED) {
        delay(500);
        Serial.print(".");
      }
      randomSeed(micros());
      Serial.println("");
      Serial.println("WiFi connected");
      Serial.println("IP address: ");
      Serial.println(WiFi.localIP());
    }
    void callback(char* topic, byte* payload, unsigned int length) {
      Serial.print("Message arrived [");
      Serial.print(topic);
      Serial.print("] ");
      for (int i = 0; i < length; i++) {
        Serial.print((char)payload[i]);
      }
      Serial.println();
    }
    void reconnect() {
      while (!client.connected()) {
        Serial.print("Attempting MQTT connection...");
        // Create a random client ID
        String clientId = "ESP8266Client-";
        clientId += String(random(0xffff), HEX);
        // Attempt to connect
        if (client.connect(clientId.c_str())) {
          Serial.println("connected");
          if (espClient.verify(fingerprint, mqtt_server)) {
            Serial.println("certificate matches");
          } else {
            Serial.println("certificate doesn't match");
          }
          client.publish("fromDevice", "hello world");
          client.subscribe("fromBroker");
        } else {
          Serial.print("failed, rc=");
          Serial.print(client.state());
          Serial.println(" try again in 5 seconds");
          // Wait 5 seconds before retrying
          delay(5000);
        }
      }
    }
    void setup() {
      Serial.begin(115200);
      setup_wifi();
      client.setServer(mqtt_server, sslport);
      client.setCallback(callback);
    }
    void loop() {
      if (!client.connected()) {
        reconnect();
      }
      client.loop();
      long now = millis();
      if (now - lastMsg > 2000) {
        lastMsg = now;
        ++value;
        snprintf (msg, 75, "hello world #%ld", value);
        Serial.print("Publish message: ");
        Serial.println(msg);
        client.publish("fromDevice", msg);
      }
    }
== refs
http://forum.wampserver.com/read.php?2,124940
http://www.phpjoel.com/2011/04/07/installing-ssl-using-openssl-on-a-wamp-localhost/
https://rietta.com/blog/2012/01/27/openssl-generating-rsa-key-from-command/
https://community.letsencrypt.org/t/certificates-for-hosts-on-private-networks/174/6
http://stackoverflow.com/questions/10873295/error-message-forbidden-you-dont-have-permission-to-access-on-this-server
https://httpd.apache.org/docs/2.4/mod/mod_proxy_wstunnel.html
http://blog.revathskumar.com/2015/09/proxy-websocket-via-apache.html
http://superuser.com/questions/1083766/how-do-i-deal-with-neterr-cert-authority-invalid-in-chrome


==instructions

create certs in c:/wamp/vhosts/somecerts
    
    openssl genrsa -out somecerts/webserver.key 2048

    openssl req -new -key somecerts/webserver.key -out somecerts/webserver.csr

One of the prompts will be for "Common Name (e.g. server FQDN or YOUR name) []:".
It is important that this field be filled in with the fully qualified domain name of the server to be protected by SSL.    

    openssl x509 -req -days 365 -in somecerts/webserver.csr -signkey somecerts/webserver.key -out somecerts/webserver.crt

move them over to c:/wamp/OpenSSL/certs 

c:/wamp/bin/apache/apache2.5/con/extra/httpd-vhosts.conf

    <VirtualHost *:80>
        DocumentRoot "c:/wamp/www"
        ServerName localhost
        <Directory  "c:/wamp/www">
            AllowOverride All
            Require local
            Options Indexes FollowSymLinks
        </Directory>
    </VirtualHost>
    <VirtualHost *:80>
        DocumentRoot "c:/wamp/vhosts/nonssl"
        ServerName nonsslvh.tm
        <Directory  "c:/wamp/vhosts/nonssl">
            AllowOverride All
            Require local
        </Directory>
    </VirtualHost>
    <VirtualHost *:80>
        DocumentRoot "c:/wamp/vhosts/nonssl2"
        ServerName nonsslvh2.tm
        <Directory  "c:/wamp/vhosts/nonssl2">
            AllowOverride All
            Require local
        </Directory>
    </VirtualHost>

c:/wamp/bin/apache/apache2.5/con/extra/httpd-ssl.conf

    Listen 443
    SSLCipherSuite HIGH:MEDIUM:!aNULL:!MD5
    SSLPassPhraseDialog  builtin
    SSLSessionCache        "shmcb:c:/Apache24/logs/ssl_scache(512000)"
    SSLSessionCacheTimeout  300
    <VirtualHost *:443>
      DocumentRoot "c:/wamp/vhosts/ssl"
      ServerName sslvh.tm
      ServerAdmin mckenna.tim@gmail.com
      ErrorLog "c:/wamp/logs/ssl_error.log"
      TransferLog "c:/wamp/logs/ssl_access.log"
      SSLEngine on
      SSLCertificateFile "c:/wamp/OpenSSL/certs/webserver.crt"
      SSLCertificateKeyFile "c:/wamp/OpenSSL/certs/webserver.key"
      <FilesMatch "\.(cgi|shtml|phtml|php)$">
          SSLOptions +StdEnvVars
      </FilesMatch>
      <Directory "c:/wamp/vhosts/ssl">
          SSLOptions +StdEnvVars
          Options Indexes FollowSymLinks MultiViews
          AllowOverride All
          Require local
          # Order Deny,Allow
          # Deny from all
          # Allow from 127.0.0.1 localhost ::1
      </Directory>
      BrowserMatch "MSIE [2-5]" \
               nokeepalive ssl-unclean-shutdown \
               downgrade-1.0 force-response-1.0
      CustomLog "c:/wamp/logs/ssl_request.log" \
                "%t %h %{SSL_PROTOCOL}x %{SSL_CIPHER}x \"%r\" %b"
    </VirtualHost>    
#ifndef MQclient_h
#define MQclient_h

#include <PubSubClient.h>
#include <WiFiClientSecure.h>

class Console{
public:
  Console(char* devid, PubSubClient& client);
  PubSubClient cclient;
  char* cdevid;
	void log(char* dd);
};

class MQclient{
public:
	MQclient(char* devid);
  char* cdevid;
	void reconn(PubSubClient& client, WiFiClientSecure& espClient);
};

extern char itopic[40];
extern char ipayload[250];
extern bool NEW_MAIL;
void handleCallback(char* topic, byte* payload, unsigned int length);

#endif
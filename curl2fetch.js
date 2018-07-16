const parse = require('curl-to-fetch');
 
const fetchCode = parse(`curl --request POST \
	  --url 'http://https://sb-oauth.revenuemonster.my/v1/token' \
	  --header 'Authorization: Basic NjY5MTY1ODE1MDQ5NjMyNzA1MTptNzFwc3dibVFWQzBpTXNHc000TEZMSUl4czZsWEV6eA==' \
	  --header 'Content-Type: application/json' \
	  --data '{ \
	  "grantType": "client_credentials" \
	  }'`);
 
console.log(fetchCode);


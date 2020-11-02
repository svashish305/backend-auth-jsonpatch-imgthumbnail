### Description

A backend app written in NodeJS to demo auth using JWT, and protected endpoints to implement jsonpatch request and image thumbnail generation request

### APIs being used:

## Public Endpoints:

/api/users/register -> Registers a user with email and password  
/api/users/login -> Logins a user with email and password, returning jwt AccessToken

## Protected Endpoints:

/api/users/patch-json -> Takes json doc obj and patchJson query array (uses jsonpatch syntax) and returns the patched JSON object as response  
/api/users/generate-image-thumbnail -> Takes image url and downloads its 50x50 thumbnail in thumbnails folder inside project root

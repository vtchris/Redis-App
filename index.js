const dotenv = require('dotenv');
const express = require('express');
const fetch = require('node-fetch');
const redis = require('redis');

dotenv.config();

const PORT = process.env.PORT || 5000;
const PORT_REDIS = process.env.PORT_REDIS || 6380;

const client = redis.createClient(PORT_REDIS, process.env.REDISCACHEHOSTNAME, {auth_pass: process.env.REDISCACHEKEY, tls: {servername: process.env.REDISCACHEHOSTNAME}});

const app = express();

const RedisTest = require('./redistest');
RedisTest.testCache();
//require('./redistest').testCache();

function setResponse(username, repos){
    return `<h2>${username} has  ${repos} Github repos!</h2>`;
}

async function getRepos(req, res, next) {
    try {
        console.log('Fetching Data...');
        const { username } = req.params;
        const response = await fetch(`https://api.github.com/users/${username}`);
        const data = await response.json();
        //res.send(data);
        const repos = data.public_repos;

        //set ex allows you to set an expiration date for the data in the cache
        client.setex(username, 3600, repos);
        res.send(setResponse(username,repos));

    } catch(err) {
        console.log(err);
        res.status(500);
    }

}

// Cache middleware
function cache(req,res,next){
    const { username } = req.params;

    client.get(username, (err,data) => {
        if(err) throw err;
        if(data) {
            res.send(setResponse(username,data));
        }else{
            next();
        }
    })
}

// First check cache, if no data is found goto getRepos
app.get('/repos/:username', cache, getRepos);

app.listen(PORT, ()=> {
    console.log(`App listening on port ${PORT}`);
});
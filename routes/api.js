var express = require('express');
var router = express.Router();
var chai = require('chai');
var chaiHttp = require('chai-http');
var assert = chai.assert;

/************** Synapse payent API ****************/

var Users = require('../lib/Users.js');
var Helpers = require('./Helpers.js');
var Nodes = require('../lib/Nodes.js');

/******************  Plaid payment API ******************/
var envvar = require('envvar');
var moment = require('moment');
var plaid = require('plaid');

var APP_PORT = 8000;
var PLAID_CLIENT_ID = '58daaf13bdc6a40edcf7dbd7';
var PLAID_SECRET = 'a3c1a57267955f54751ae0024333a4';
var PLAID_PUBLIC_KEY = '7f18aee7af8861ed5a82cf62912cf2';
var PLAID_ENV = envvar.string('PLAID_ENV', 'sandbox');

// We store the access_token in memory - in production, store it in a secure
// persistent data store
var ACCESS_TOKEN = null;
var PUBLIC_TOKEN = null;
var ITEM_ID = null;

// Initialize the Plaid client
var plaid_client = new plaid.Client(
    PLAID_CLIENT_ID,
    PLAID_SECRET,
    PLAID_PUBLIC_KEY,
    plaid.environments[PLAID_ENV]
);

//************************* DynamoDB Schema Define ****************************//
var Userschema = require('../models/user');
var Donorschema = require('../models/donor');
var Recipientschema = require('../models/recipient');


chai.use(chaiHttp);
var unverifiedUser;
var baseUrl = process.env.BASEURL;

router.post('/users', function(req, res) {

    var createPayload = {
        logins: [{
            email: 'nodeTest@synapsepay.com',
            password: 'test1234',
            read_only: false
        }],
        phone_numbers: [
            '901.111.1111'
        ],
        legal_names: [
            'NODE TEST USER'
        ],
        extra: {
            note: 'Interesting user',
            supp_id: '122eddfgbeafrfvbbb',
            is_business: false
        }
    };
    Users.create(
        Helpers.client,
        Helpers.fingerprint,
        Helpers.ip_address,
        createPayload,
        function(err, user) {
            res.json(user);
        });

});
router.get('/users', function(req, res) {

    let options = {
        ip_address: Helpers.ip_address,
        page: '', //optional
        per_page: '', //optional
        query: '' //optional
    };
    Users.get(
        Helpers.client,
        options,
        function(err, usersResponse) {
            // error or array of user objects
            res.json(usersResponse);
        });
});

router.get('/users/:id', function(req, res) {

    let options = {
        _id: req.params.id,
        fingerprint: Helpers.fingerprint,
        ip_address: '127.0.0.1',
        full_dehydrate: 'yes' //optional
    };
    let user;
    Users.get(
        Helpers.client,
        options,
        function(errResp, userResponse) {
            // error or user object

            if (errResp) {
                res.json(errResp);
            } else {
                user = userResponse;
                res.json(user);
            }

        });
});

router.get('/nodes/:id', function(req, res) {

    let options = {
        _id: req.params.id,
        fingerprint: Helpers.fingerprint,
        ip_address: '127.0.0.1',
        full_dehydrate: 'yes' //optional
    };
    let user;
    Users.get(
        Helpers.client,
        options,
        function(errResp, userResponse) {
            // error or user object

            if (errResp) {
                res.json("user err");
            } else {
                user = userResponse;
                Nodes.get(
                    user,
                    null,
                    function(err, nodesResponse) {
                        // error or array of node objects
                        res.json(nodesResponse);
                    });
            }

        });

});

router.post('/test', function(req, res) {

    var obj1 = [{ id: 1, node: { id: 1, name: 2 } }];
    var obj2 = { id: 2, node: { id: 2, name: 3 } };
    var obj = []
    obj1.push(obj2);
    Recipientschema.get({ id: '1500827023939' }, function(err, nodes) {
            if (err) { return console.log(err); }
            nodes.loans.push(obj2);
            res.json(nodes.loans);
        })
        //obj.push(obj2);

});


router.post('/signin', function(req, res) {
    console.log(req.body.email);
    if (req.body.email && req.body.password) {
        Userschema.get({ email: req.body.email }, function(err, user) {
            if (!user) {
                res.json({ "success": false, "msg": "No Register" });
            } else {
                if (req.body.password == user.password) {
                    res.json({ "success": true, "msg": "login success", "user_id": user.user_id, "has_account": user.has_account, "user_type": user.user_type });
                } else {
                    res.json({ "success": false, "msg": "Invalid password" });
                }
            }

        });
    } else {
        res.json({ "success": false, "msg": "Invalid Value" });
    }
});

router.post('/recipient/signup', function(req, res) {
    if (req.body.email && req.body.password) {
        var id = new Date().getTime().toString();
        var register_user = new Userschema({
            email: req.body.email,
            user_id: id,
            password: req.body.password,
            user_type: 'recipient',
            has_account: false
        });
        register_user.save({
            condition: '#o <> :email',
            conditionNames: { o: 'email' },
            conditionValues: { email: req.body.email }
        }, function(err) {
            if (err) {
                res.json({ "success": false, "msg": "Already exist user" });
            } else {
                res.json({ "success": true, "msg": "Successfully created", "user_id": id });
            }
        });
    } else {
        res.json({ "success": false, "msg": "Invalid Vlaue" });
    }
});

router.post('/recipient/create_account/:id', function(req, res) {
    if (req.body.email && req.body.name) {
        Userschema.get({ email: req.body.email }, function(err, db_user) {
            if (!db_user) {
                res.json({ "success": false, "msg": "No Register" });
            } else {
                if (db_user.user_id == req.params.id && !db_user.has_account) {
                    var create_Synaps_user = {
                        logins: [{
                            email: req.body.email,
                            read_only: false
                        }],
                        phone_numbers: [
                            '901.111.1111'
                        ],
                        legal_names: [
                            req.body.name
                        ],
                        extra: {
                            note: 'Recipient Synapse user',
                            supp_id: '122eddfgbeafrfvbbb',
                            is_business: false
                        }
                    };
                    if (db_user.synapse_user_id) {
                        console.log("you have account already")
                    } else {
                        Users.create(
                            Helpers.client,
                            Helpers.fingerprint,
                            Helpers.ip_address,
                            create_Synaps_user,
                            function(err, synapse_user) {
                                if (err) {
                                    res.json(err);
                                } else {
                                    var recipient = new Recipientschema({
                                        id: req.params.id,
                                        email: req.body.email,
                                        name: req.body.name,
                                        birthday: req.body.birthday,
                                        address: req.body.address,
                                        city: req.body.city,
                                        state: req.body.state,
                                        zip: req.body.zip,
                                        synapse_user_id: synapse_user.json._id
                                    })
                                    recipient.save(function(err) {
                                        if (err) { return console.log(err); } else {
                                            Userschema.update({ email: req.body.email }, { has_account: true }, function(err) {
                                                if (err) { return console.log(err) }
                                                console.log("Recipient Created" + req.params.id);
                                                res.json({ "success": true, "msg": "Successfully created" });
                                            })
                                        }
                                    })


                                }
                            });
                    }
                } else {
                    console.log("Error" + req.params.id);
                    res.json({ "success": false, "msg": "Error" });
                }
            }

        });
    } else {
        res.json({ "success": false, "msg": "Invalid input" });
    }
});

router.post('/recipient/add_loan/:id', function(req, res) {

    /// get recipient db from id params
    var recipient_user;
    Recipientschema.get({ id: req.params.id }, function(err, user) {
        if (!user) {
            res.json({ "success": false, "msg": "No Register" });
        } else {
            recipient_user = user;
            console.log(recipient_user["synapse_user_id"] + "\n");
        }

    });
    //// get plaid accunt from publick_token 
    PUBLIC_TOKEN = req.body.public_token;
    var account_id = req.body.account_id;
    console.log(PUBLIC_TOKEN);
    plaid_client.exchangePublicToken(PUBLIC_TOKEN, function(error, tokenResponse) {
        if (error != null) {
            var msg = 'Could not exchange public_token!';
            console.log(msg + '\n' + error);
            return res.json({ "success": false, "msg": "Error" });
        }
        ACCESS_TOKEN = tokenResponse.access_token;
        ITEM_ID = tokenResponse.item_id;
        console.log('Access Token: ' + ACCESS_TOKEN);
        console.log('Item ID: ' + ITEM_ID);

        plaid_client.getAuth(ACCESS_TOKEN, function(error, authResponse) {
            if (error != null) {
                var msg = 'Unable to pull accounts from the Plaid API.';
                console.log(msg + '\n' + error);
                return res.json({ "success": false, "msg": "Error" });
            }

            console.log(authResponse.accounts);
            var numbers = authResponse.numbers;
            for (var i = 0; i < numbers.length; i++) {
                if (numbers[i].account_id === account_id)
                    var selected_number = numbers[i];
            }
            console.log(selected_number);
            var ach_Node = {
                type: 'ACH-US',
                info: {
                    nickname: 'Node Library Checking Account',
                    name_on_account: 'Node Library',
                    account_num: '72347235423',
                    routing_num: '051000017',
                    type: 'PERSONAL',
                    class: 'CHECKING'
                },
                extra: {
                    supp_id: '122eddfgbeafrfvbbb'
                }
            };

            ///get synapse useraccount from id of user dynamodb  
            console.log("synapse");
            let options = {
                _id: recipient_user["synapse_user_id"],
                fingerprint: Helpers.fingerprint,
                ip_address: '127.0.0.1',
                full_dehydrate: 'yes' //optional
            };
            let node_user;
            Users.get(
                Helpers.client,
                options,
                function(errResp, userResponse) {
                    // error or user object

                    if (errResp) {
                        res.json("user err");
                    } else {
                        node_user = userResponse;
                        Nodes.create(node_user, ach_Node, function(err, nodesResponse) {
                            if (err) {
                                return res.json();
                            } else {
                                Recipientschema.update({ id: recipient_user.id }, { loans: nodesResponse }, function(err) {
                                    if (err) { return res.json(); }
                                    console.log("Add loans");
                                    res.json({ "success": true, "msg": "Success" });
                                })
                            }
                        });
                    }

                });

            /*response.json({
            error: false,
            accounts: authResponse.accounts,
            numbers: authResponse.numbers,
    });*/
        });
        res.json({
            'error': false
        });
    });
});

router.get('/profile/:id', function(req, res) {
    res.json(req.params.id);
});

router.post('/profile/:id', function(req, res) {
    if (req.body.name) {
        var create_profile = new Profileschema({
            id: req.params.id,
            name: req.body.name,
            birthday: req.body.birthday,
            address: req.body.adress,
            city: req.body.city,
            state: req.body.state,
            zip: req.body.zip
        });
        create_profile.save({
            condition: '#o <> :id',
            conditionNames: { o: 'id' },
            conditionValues: { id: req.params.id }
        }, function(err) {
            if (err) {
                res.json({ "success": "false", "msg": "Exist profile" });
            } else {
                res.json({ "success": "true", "msg": "profile created success" });
            }

        });
    } else {
        res.json({ "success": "false", "msg": "Invalid Vlaue" });
    }

});
router.get('/', function(req, res) {
    res.json('API RUNNING');
});

/************************ Donor ******************/
router.post('/donor/signup', function(req, res) {
    if (req.body.email && req.body.password) {
        var id = new Date().getTime().toString();
        var register_user = new Userschema({
            email: req.body.email,
            user_id: id,
            password: req.body.password,
            user_type: 'donor',
            has_account: false
        });
        register_user.save({
            condition: '#o <> :email',
            conditionNames: { o: 'email' },
            conditionValues: { email: req.body.email }
        }, function(err) {
            if (err) {
                res.json({ "success": false, "msg": "Already exist user" });
            } else {
                res.json({ "success": true, "msg": "Successfully created", "user_id": id });
            }
        });
    } else {
        res.json({ "success": false, "msg": "Invalid Vlaue" });
    }
});

router.post('/donor/create_account/:id', function(req, res) {
    if (req.body.email && req.body.name) {
        Userschema.get({ email: req.body.email }, function(err, db_user) {
            if (!db_user) {
                res.json({ "success": false, "msg": "No Register" });
            } else {
                if (db_user.user_id == req.params.id && !db_user.has_account) {
                    var create_Synaps_user = {
                        logins: [{
                            email: req.body.email,
                            read_only: false
                        }],
                        phone_numbers: [
                            '901.111.1111'
                        ],
                        legal_names: [
                            req.body.name
                        ],
                        extra: {
                            note: 'Donor Synapse user',
                            supp_id: '122eddfgbeafrfvbbb',
                            is_business: false
                        }
                    };
                    if (db_user.synapse_user_id) {
                        console.log("you have account already")
                    } else {
                        Users.create(
                            Helpers.client,
                            Helpers.fingerprint,
                            Helpers.ip_address,
                            create_Synaps_user,
                            function(err, synapse_user) {
                                if (err) {
                                    res.json(err);
                                } else {
                                    var recipient = new Recipientschema({
                                        id: req.params.id,
                                        email: req.body.email,
                                        name: req.body.name,
                                        birthday: req.body.birthday,
                                        address: req.body.address,
                                        city: req.body.city,
                                        state: req.body.state,
                                        zip: req.body.zip,
                                        synapse_user_id: synapse_user.json._id
                                    })
                                    recipient.save(function(err) {
                                        if (err) { return console.log(err); } else {
                                            Userschema.update({ email: req.body.email }, { has_account: true }, function(err) {
                                                if (err) { return console.log(err) }
                                                console.log("Donor Created" + req.params.id);
                                                res.json({ "success": true, "msg": "Successfully created" });
                                            })
                                        }
                                    })


                                }
                            });
                    }
                } else {
                    console.log("Error" + req.params.id);
                    res.json({ "success": false, "msg": "Error" });
                }
            }

        });
    } else {
        res.json({ "success": false, "msg": "Invalid input" });
    }
});
module.exports = router;
/*
function getUser(userID){
   let options = {
            ip_address: Helpers.ip_address,
            page: '', //optional
            per_page: '', //optional
            query: '' //optional
        };console.log(userID);
        Users.get(
        Helpers.client,
        options,
        function(err, usersResponse) {
            // error or array of user objects
           return usersResponse;
        });
    
}*/
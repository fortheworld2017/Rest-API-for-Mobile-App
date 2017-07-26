var express = require('express');
var router = express.Router();
var chai = require('chai');
var chaiHttp = require('chai-http');
var assert = chai.assert;

/************** Synapse payent API ****************/

var Users = require('../lib/Users.js');
var Helpers = require('./Helpers.js');
var Nodes = require('../lib/Nodes.js');
var Transactions = require('../lib/Transactions.js');

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

    /* var obj1 = [{ id: 1, node: { id: 1, name: 2 } }];
     var obj2 = { id: 2, node: { id: 2, name: 3 } };
     var obj = []
     obj1.push(obj2);
     Recipientschema.get({ id: '1500827023939' }, function(err, nodes) {
             if (err) { return console.log(err); }
             nodes.loans.push(obj2);
             res.json(nodes.loans);
         })
         //obj.push(obj2);*/
    var recipient_user;
    Recipientschema.get({ id: '1500827023939' }, function(err, user) {
        if (!user) {
            res.json({ "success": false, "msg": "No Register" });
        } else {
            recipient_user = user;
            console.log(recipient_user.synapse_user_id + "\n");
        }

    });

});


router.post('/signin', function(req, res) {
    console.log(req.body.email);
    if (req.body.email && req.body.password) {
        Userschema.get({ email: req.body.email }, function(err, user) {
            if (!user) {
                res.json({ "success": false, "msg": "No Register" });
            } else {
                if (req.body.password == user.password) {
                    res.json({
                        "success": true,
                        "msg": "login success",
                        "user": user
                    });
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
            phone: req.body.phone,
            password: req.body.password,
            user_type: 'recipient',
            // has_account: false
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
                            req.body.phone
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
                    } else { /******************* Synapse User create */
                        Users.create(
                            Helpers.client,
                            Helpers.fingerprint,
                            Helpers.ip_address,
                            create_Synaps_user,
                            function(err, synapse_user) {
                                if (err) {
                                    res.json(err);
                                } else { /********** Recipient db create */
                                    var recipient = new Recipientschema({
                                        id: req.params.id,
                                        email: req.body.email,
                                        phone: req.body.phone,
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

    Recipientschema.get({ id: req.params.id }, function(err, db_user) {
        if (err) {
            res.json({ "success": false, "msg": "No Register" });
        } else {
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
                    var selected_index;
                    var numbers = authResponse.numbers;
                    for (var i = 0; i < numbers.length; i++) {
                        if (numbers[i].account_id === account_id)
                            selected_index = i;
                    }

                    var ach_Node = {
                        type: 'ACH-US',
                        info: {
                            nickname: 'Slap Recipient Loan',
                            account_num: numbers[selected_index].account,
                            routing_num: numbers[selected_index].routing,
                            type: 'PERSONAL',
                            class: 'SAVINGS'
                        },
                        extra: {
                            supp_id: '122eddfgbeafrfvbbb'
                        }
                    };

                    ///get synapse useraccount from id of user dynamodb  
                    var node_User;
                    let options = {
                        _id: db_user.synapse_user_id,
                        fingerprint: Helpers.fingerprint,
                        ip_address: '127.0.0.1',
                        full_dehydrate: 'yes' //optional
                    };
                    Users.get(
                        Helpers.client,
                        options,
                        function(errResp, userResponse) {
                            // error or user object

                            if (errResp) {
                                res.json("user err");
                            } else {
                                node_user = userResponse;
                                /******************   Node user add */
                                Nodes.create(node_user, ach_Node, function(err, nodesResponse) {
                                    if (err) {
                                        return res.json({ "success": true, "msg": "Error" });
                                    } else {

                                        console.log('nodesResponse[0].json');
                                        console.log(nodesResponse[0].json);
                                        console.log('nodesResponse[0].json._id');
                                        console.log(nodesResponse[0].json._id);
                                        console.log('nodesResponse[0].json.info.bank_long_name');
                                        console.log(nodesResponse[0].json.info.bank_long_name);
                                        var node_obj = [];
                                        if (db_user.loans)
                                            node_obj = db_user.loans;
                                        // node_obj.push(db_user.loans);
                                        let node_options_new = {
                                            node_id: nodesResponse[0].json._id,
                                            bank_name: nodesResponse[0].json.info.bank_long_name,
                                            access_token: ACCESS_TOKEN,
                                            account_id: authResponse.accounts[selected_index].account_id
                                        }
                                        node_obj.push(node_options_new);
                                        Recipientschema.update({ id: db_user.id }, { loans: node_obj }, function(err) {
                                            if (err) { return res.json(); }
                                            console.log("Add loans");
                                            res.json({ "success": true, "msg": "Success" });
                                        })
                                    }
                                });
                            }

                        });
                });
            });

        }

    });

});
router.post('/recipient/add_donor/:id', function(req, res) {
    Recipientschema.get({ id: req.params.id }, function(err, db_user) {
        if (err) {
            res.json({ "success": false, "msg": "Error" });
        } else {
            var donors = [];
            if (db_user.donors)
                donors = db_user.donors;

            var new_donor = {
                "email": req.body.email,
                "name": req.body.name,
                "phone": req.body.phone,
                "loan": req.body.loan,
                "connected": false
            }
            donors.push(new_donor);
            Recipientschema.update({ id: req.params.id }, { donors: donors }, function(err) {
                if (err) { return res.json({ "success": false, "msg": "Error" }); }
                console.log("Added new donor");
                res.json({ "success": true, "msg": "Success" });
            })

        }
    });
});
router.get('/recipient/get_donors/:id', function(req, res) {
    Recipientschema.get({ id: req.params.id }, function(err, db_user) {
        if (err) {
            res.json({ "success": false, "msg": "Error" });
        } else {
            res.json({ "success": true, "msg": "Success", "donors": db_user.donors });
        }
    });
});

router.post('/recipient/get_donor/:id', function(req, res) {
    Recipientschema.get({ id: req.params.id }, function(err, db_user) {
        if (err) {
            return res.json({ "success": false, "msg": "Error" });
        } else {
            var bank_name;
            for (var i = 0; i < db_user.donors.length; i++) {
                for (var j = 0; j < db_user.loans.length; j++) {
                    if (db_user.donors[i].email == req.body.donor_email && db_user.donors[i].loan == db_user.loans[j].node_id) {
                        bank_name = db_user.loans[j].bank_name;
                    }
                }
            }
            console.log(req.body.donor_email);
            Userschema.get({ email: req.body.donor_email }, function(err, donor_user) {
                if (err) {
                    return res.json({ "success": false, "msg": "Error" });
                }
                console.log(err);
                console.log(donor_user);
                Donorschema.get({ id: donor_user.user_id }, function(err, db_donor) {
                    if (err) {
                        return res.json({ "success": false, "msg": "Error" });
                    }
                    var donor_recipient;
                    for (var i = 0; i < db_donor.recipients.length; i++) {
                        if (db_donor.recipients[i].recipient_id == req.params.id)
                            donor_recipient = db_donor.recipients[i];
                    }
                    res.json({ "success": true, "msg": "Success", "counts": donor_recipient.count, "balance": donor_recipient.balance, "bank_name": bank_name });
                });
            })

        }
    });
});

router.get('/recipient/update_donors/:id', function(req, res) {
    Recipientschema.get({ id: req.params.id }, function(err, db_user) {
        if (err) {
            res.json({ "success": false, "msg": "Error" });
        } else {
            res.json({ "success": true, "msg": "Success", "donors": db_user.donors });
        }
    });
});

router.get('/recipient/get_loans/:id', function(req, res) {
    console.log("get_loans");
    console.log(req.params.id);
    Recipientschema.get({ id: req.params.id }, function(err, db_user) {
        if (err) {
            console.log("error");
            res.json({ "success": false, "msg": "Error" });
        } else {
            console.log(db_user);
            res.json({ "success": true, "msg": "Success", "loans": db_user.loans });
            console.log("success");
        }
    });
});

router.get('/recipient/get_balances/:id', function(req, res) {
    Recipientschema.get({ id: req.params.id }, function(err, db_user) {
        if (err) {
            res.json({ "success": false, "msg": "Error" });
        } else {
            /****** get balance from plaid using access_token */
            var loan_balances = [];

            let options = {
                _id: db_user.synapse_user_id,
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
                                console.log(nodesResponse.nodes);
                                // error or array of node objects
                                for (var i = 0; i < nodesResponse.nodes.length; i++) {
                                    loan_balances[i] = { "node_id": nodesResponse.nodes[i]._id, "bank_name": nodesResponse.nodes[i].info.bank_name, "balance": nodesResponse.nodes[i].info.balance.amount };
                                }
                                var parameters = [];
                                for (var i = 0; i < db_user.donors.length; i++) {
                                    if (db_user.donors[i].connected) {
                                        if (parameters.length > 0) {
                                            parameters.push({ "email": db_user.donors[i].email });
                                        } else {
                                            parameters = [{ "email": db_user.donors[i].email }];
                                        }
                                    }
                                }
                                if (parameters.length == 0) {
                                    return res.json({ "success": true, "msg": "Success", "loans": loan_balances, "donors": null });
                                }
                                Userschema.batchGet(parameters, function(err, users) {
                                    if (err) { return res.json({ "success": false, "msg": "Error" }); }
                                    parameters = [];
                                    for (var i = 0; i < users.length; i++) {
                                        if (parameters.length > 0) {
                                            parameters.push({ "email": users[i].user_id });
                                        } else {
                                            parameters = [{ "email": users[i].user_id }];
                                        }
                                    }
                                    Donorschema.batchGet(parameters, function(err, donors) {
                                        var donor_users = [];
                                        for (var i = 0; i < donors.length; i++) {
                                            for (var j = 0; j < donors[i].recipients.length; j++) {
                                                if (donors[i].recipients[j].recipient_id == req.params.id) {
                                                    if (donor_users.length > 0)
                                                        donor_users.push({ "name": donors[i].name, "balance": donors[i].recipients[j].balance });
                                                    else
                                                        donor_users = [{ "name": donors[i].name, "balance": donors[i].recipients[j].balance }];
                                                }
                                            }
                                        }
                                        res.json({ "success": true, "msg": "Success", "loans": loan_balances, "donors": donor_user });
                                    });
                                })

                            });
                    }

                });

            // for (var i = 0; i < db_user.loans.length; i++) {
            //     plaid_client.getAuth(db_user.loans[i].access_token, function(error, numbersData) {
            //         if (error != null) {
            //             var msg = 'Unable to pull accounts from Plaid API.';
            //             console.log(msg + '\n' + error);
            //             //return res.json({ error: msg });
            //         }
            //         // res.json({
            //         //     error: false,
            //         //     accounts: numbersData.accounts,
            //         //     numbers: numbersData.numbers,
            //         // });
            //         for (var j = 0; j < numbersData.accounts; j++) {
            //             if(numbersData.accounts[j].account_id = db_user.loans[i].account_id){
            //                 loan_balances[i] = {}
            //             }
            //         }
            //         if (numbersData.accounts.account_id)
            //             console.log(numbersData.accounts);
            //     });
            //     console.log(db_user.loans.length);
            // }

            //res.json({ "success": true, "msg": "Success", "loans": db_user.loans });
        }
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
    console.log("create donor");
    if (req.body.email && req.body.password) {
        var id = new Date().getTime().toString();
        var register_user = new Userschema({
            email: req.body.email,
            user_id: id,
            password: req.body.password,
            user_type: 'donor',
            // has_account: false
        });
        register_user.save({
            condition: '#o <> :email',
            conditionNames: { o: 'email' },
            conditionValues: { email: req.body.email }
        }, function(err) {
            if (err) {
                console.log(err);
                res.json({ "success": false, "msg": "Already exist user" });
            } else {
                console.log("created donor");
                res.json({ "success": true, "msg": "Successfully created", "user_id": id });
            }
        });
    } else {
        res.json({ "success": false, "msg": "Invalid Vlaue" });
    }
});

router.post('/donor/create_account/:id', function(req, res) {
    console.log(req.body);
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
                                    var donor = new Donorschema({
                                        id: req.params.id,
                                        email: req.body.email,
                                        name: req.body.name,
                                        birthday: req.body.birthday,
                                        address: req.body.address,
                                        city: req.body.city,
                                        state: req.body.state,
                                        zip: req.body.zip,
                                        synapse_user_id: synapse_user.json._id,
                                        phone: req.body.phone
                                    })
                                    donor.save(function(err) {
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
router.post('/donor/bank/:id', function(req, res) {

    /// get donor db from id params

    Donorschema.get({ id: req.params.id }, function(err, db_user) {
        if (err) {
            res.json({ "success": false, "msg": "No Register" });
        } else {
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
                    var selected_index;
                    for (var i = 0; i < numbers.length; i++) {
                        if (numbers[i].account_id === account_id)
                            selected_index = i;
                    }
                    console.log(selected_index);
                    var ach_Node = {
                        type: 'ACH-US',
                        info: {
                            nickname: 'Slap Donor',
                            name_on_account: authResponse.accounts[selected_index].name,
                            account_num: numbers[selected_index].account,
                            routing_num: numbers[selected_index].routing,
                            type: 'PERSONAL',
                            class: 'SAVINGS'
                        },
                        extra: {
                            supp_id: '122eddfgbeafrfvbbb'
                        }
                    };

                    ///get synapse useraccount from id of user dynamodb  
                    var node_User;
                    let options = {
                        _id: db_user.synapse_user_id,
                        fingerprint: Helpers.fingerprint,
                        ip_address: '127.0.0.1',
                        full_dehydrate: 'yes' //optional
                    };
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
                                        return res.json({ "success": true, "msg": "Error" });
                                    } else {

                                        console.log('nodesResponse[0].json');
                                        console.log(nodesResponse[0].json);
                                        console.log('nodesResponse[0].json._id');
                                        console.log(nodesResponse[0].json._id);
                                        console.log('nodesResponse[0].json.info.bank_long_name');
                                        console.log(nodesResponse[0].json.info.bank_long_name);
                                        db_user.bank_name = nodesResponse[0].json.info.bank_long_name;
                                        db_user.node_id = nodesResponse[0].json._id;
                                        db_user.access_token = ACCESS_TOKEN;
                                        // var donor_user = new Donorschema({
                                        //     id: db_user.id,
                                        //     email: db_user.email,
                                        //     name: db_user.name,
                                        //     birthday: db_user.birthday,
                                        //     address: db_user.address,
                                        //     city: db_user.city,
                                        //     state: db_user.state,
                                        //     zip: db_user.zip,
                                        //     synapse_user_id: db_user.synapse_user_id,
                                        //     bank_name: nodesResponse[0].json.info.bank_long_name,
                                        //     node_id: nodesResponse[0].json._id,
                                        //     access_token: ACCESS_TOKEN
                                        // });
                                        db_user.save(function(err) {
                                            if (err) {
                                                console.log(err);
                                                return res.json({ "success": false, "msg": "Error" });
                                            }
                                            Userschema.update({ email: db_user.email }, { has_bank: true }, function(err) {
                                                if (err) { return console.log(err) }
                                                console.log("Added Donor Bank");
                                                res.json({ "success": true, "msg": "Success" });
                                            })

                                        });
                                        // Donorschema.update({ id: db_user.id }, {
                                        //     bank_name: nodesResponse[0].json.info.bank_long_name,
                                        //     access_token: ACCESS_TOKEN,
                                        //     node_id: nodesResponse[0].json._id
                                        // }, function(err) {
                                        //     if (err) { return res.json(); }
                                        //     console.log("Added Donor Bank");
                                        //     res.json({ "success": true, "msg": "Success" });
                                        // })
                                    }
                                });
                            }

                        });
                });
            });

        }

    });

});
router.post('/transactions/:id', function(req, res) {
    Donorschema.get({ id: req.params.id }, function(err, donor_user) {
        if (err) {
            res.json({ "success": false, "msg": "Error" });
        } else {
            var createPayload = {
                to: {
                    type: 'SYNAPSE-US',
                    id: req.body.to_node_id
                },
                amount: {
                    amount: 100,
                    currency: 'USD'
                },
                extra: {
                    supp_id: '',
                    note: 'Deposit to synapse account',
                    webhook: '',
                    process_on: 0,
                    ip: '192.168.0.1'
                }
            };

            var testUser;
            var testNode;
            Users.get(
                Helpers.client, {
                    ip_address: Helpers.ip_address,
                    fingerprint: Helpers.fingerprint,
                    _id: donor_user.synapse_user_id
                },
                function(err, user) {
                    if (err) { return res.json({ "success": false, "msg": "Error" }); }
                    testUser = user;
                    Nodes.get(
                        testUser, {
                            _id: donor_user.node_id
                        },
                        function(err, node) {
                            if (err) { return res.json({ "success": false, "msg": "Error" }); }
                            testNode = node;
                            console.log(testNode);
                            Transactions.create(
                                testNode,
                                createPayload,
                                function(err, transaction) {
                                    if (err) { return res.json({ "success": false, "msg": "Error" }); }
                                    res.json({ "success": true, "transaction": transaction });
                                }
                            );
                        }
                    );
                });


        }
    });
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
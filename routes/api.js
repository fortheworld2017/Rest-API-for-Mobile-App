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

    var obj1 = [{ id: 1, node: { id: 1, name: 2 } }];
    var obj2 = { id: 2, node: { id: 2, name: 3 } };
    var obj = []
    obj = obj1;
    obj.push(obj2);
    console.log(obj);
    //  obj1.push(obj2);
    //  Recipientschema.get({ id: '1500827023939' }, function(err, nodes) {
    //          if (err) { return console.log(err); }
    //          nodes.loans.push(obj2);
    //          res.json(nodes.loans);
    //      })
    // obj.push(obj2);
    // var recipient_user;
    // Recipientschema.get({ id: '1500827023939' }, function(err, user) {
    //     if (!user) {
    //         res.json({ "success": false, "msg": "No Register" });
    //     } else {
    //         recipient_user = user;
    //         console.log(recipient_user.synapse_user_id + "\n");
    //     }

    // });

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
    res.json({ 'result': 'API RUNNING' });
});




// real API

router.post('/signin', function(req, res) {
    console.log(req.body.email);
    if (req.body.email && req.body.password) {
        Userschema.get({ email: req.body.email }, function(err, user) {
            if (err) {
                console.log(err);
                return res.json({ "success": false, "msg": err.message });
            }
            if (!user) {
                return res.json({ "success": false, "msg": "No Registered" });
            }
            if (req.body.password == user.password) {
                return res.json({
                    "success": true,
                    "msg": "login success",
                    "user": user
                });
            }
            return res.json({ "success": false, "msg": "Invalid Password" });
        });
    } else {
        res.json({ "success": false, "msg": "Invalid Parameter" });
    }
});

router.post('/recipient/signup', function(req, res) {
    if (req.body.email && req.body.password) {
        var id = new Date().getTime().toString();
        var register_user = new Userschema({
            email: req.body.email,
            password: req.body.password,
            user_id: id,
            user_type: 'recipient'
        });
        register_user.save({
            condition: '#o <> :email',
            conditionNames: { o: 'email' },
            conditionValues: { email: req.body.email }
        }, function(err) {
            if (err) {
                console.log(err);
                res.json({ "success": false, "msg": err.message });
            } else {
                res.json({ "success": true, "msg": "Successfully created", "user_id": id });
            }
        });
    } else {
        res.json({ "success": false, "msg": "Invalid Parameter" });
    }
});

router.post('/recipient/create_account/:id', function(req, res) {
    console.log(req.body);
    if (req.body.email && req.body.name) {
        Userschema.get({ email: req.body.email }, function(err, user) {
            if (err) {
                return res.json({ "success": false, "msg": err.message });
            }
            if (!user) {
                return res.json({ "success": false, "msg": "Invaild User ID" });
            }
            if (user.user_id == req.params.id && !user.has_account) {
                let create_synapse_user = {
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
                        supp_id: user.user_id,
                        is_business: false
                    }
                };
                /******************* Synapse User create */
                Users.create(
                    Helpers.client,
                    Helpers.fingerprint,
                    Helpers.ip_address,
                    create_synapse_user,
                    function(err, synapse_user) {
                        if (err) {
                            console.log(err);
                            res.json({ "success": false, "msg": "Failed Synapse User Create" });
                        } else {
                            console.log(JSON.stringify(synapse_user));
                            /********** Recipient db create */
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
                                if (err) {
                                    console.log(err);
                                    res.json({ "success": false, "msg": err.message });
                                } else {
                                    Userschema.update({ email: req.body.email }, { has_account: true }, function(err) {
                                        if (err) {
                                            console.log(err);
                                            res.json({ "success": false, "msg": err.message });
                                        } else {
                                            console.log("Recipient Created" + req.params.id);
                                            res.json({ "success": true, "msg": "Successfully created" });
                                        }
                                    });
                                }
                            })
                        }
                    });
            } else {
                res.json({ "success": false, "msg": "Invalid User ID" });
            }
        });
    } else {
        res.json({ "success": false, "msg": "Invalid Parameter" });
    }
});

router.get('/recipient/get_profile/:id', function(req, res) {
    Recipientschema.get({ id: req.params.id }, function(err, user_profile) {
        if (err) {
            return res.json({ "success": false, "msg": err.message });
        }
        if (!user_profile) {
            return res.json({ "success": false, "msg": "Invaild User ID" });
        } else {
            return res.json({ "success": false, "msg": "success", "user": user_profile });
        }
    });
});

router.post('/recipient/update_profile/:id', function(req, res) {
    Recipientschema.get({ id: req.params.id }, function(err, user_profile) {
        if (err) {
            return res.json({ "success": false, "msg": err.message });
        }
        if (!user_profile) {
            return res.json({ "success": false, "msg": "Invaild User ID" });
        } else {
            user_profile.adress = req.body.address;
            user_profile.name = req.body.name;
            user_profile.birthday = req.body.birthday;
            user_profile.state = req.body.state;
            user_profile.phone = req.body.phone;
            user_profile.save(function(err) {
                if (err) {
                    return res.json({ "success": false, "msg": err.message });
                }

                return res.json({ "success": true, "msg": "success" });
            });
        }
    });
});

router.post('/recipient/add_loan/:id', function(req, res) {
    /// get recipient db from id params
    Recipientschema.get({ id: req.params.id }, function(err, recipient) {
        if (err) {
            return res.json({ "success": false, "msg": err.message });
        }
        if (!recipient) {
            res.json({ "success": false, "msg": "Invaild User ID" });
        } else {
            //// get plaid accunt from publick_token 
            PUBLIC_TOKEN = req.body.public_token;
            console.log(PUBLIC_TOKEN);
            let account_id = req.body.account_id;
            plaid_client.exchangePublicToken(PUBLIC_TOKEN, function(error, tokenResponse) {
                if (error != null) {
                    console.log(msg + '\n' + error);
                    return res.json({ "success": false, "msg": "Failed Get Access Token" });
                }
                ACCESS_TOKEN = tokenResponse.access_token;
                ITEM_ID = tokenResponse.item_id;
                console.log('Access Token: ' + ACCESS_TOKEN);
                console.log('Item ID: ' + ITEM_ID);
                plaid_client.getAuth(ACCESS_TOKEN, function(error, authResponse) {
                    if (error != null) {
                        console.log(msg + '\n' + error);
                        return res.json({ "success": false, "msg": "Unable to pull accounts from the Plaid API." });
                    }

                    console.log(authResponse.accounts);
                    var selected_index;
                    let numbers = authResponse.numbers;
                    for (var i = 0; i < numbers.length; i++) {
                        if (numbers[i].account_id === account_id)
                            selected_index = i;
                    }

                    let ach_Node = {
                        type: 'ACH-US',
                        info: {
                            nickname: 'Slap Recipient Loan',
                            account_num: numbers[selected_index].account,
                            routing_num: numbers[selected_index].routing,
                            type: 'PERSONAL',
                            class: 'SAVINGS'
                        },
                        extra: {
                            supp_id: recipient.id
                        }
                    };

                    ///get synapse useraccount from synapse_user_id  
                    var node_User;
                    let options = {
                        _id: recipient.synapse_user_id,
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
                                res.json({ "success": false, "msg": "Unable to pull User from the synapse_user_id." });
                            } else {
                                node_user = userResponse;
                                /******************   Node user add */
                                Nodes.create(node_user, ach_Node, function(err, nodesResponse) {
                                    if (err) {
                                        res.json({ "success": true, "msg": "Unable to Create Node." });
                                    } else {
                                        console.log('nodesResponse');
                                        console.log(JSON.stringify(nodesResponse));
                                        var node_obj = [];
                                        if (recipient.loans)
                                            node_obj = recipient.loans;
                                        // node_obj.push(recipient.loans);
                                        let node_options_new = {
                                            node_id: nodesResponse[0].json._id,
                                            bank_name: nodesResponse[0].json.info.bank_long_name,
                                            access_token: ACCESS_TOKEN,
                                            account_id: account_id
                                        }
                                        node_obj.push(node_options_new);
                                        Recipientschema.update({ id: recipient.id }, { loans: node_obj }, function(err) {
                                            if (err) {
                                                console.log(err);
                                                return res.json({ "success": false, "msg": err.message });
                                            }
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
    Recipientschema.get({ id: req.params.id }, function(err, recipient) {
        if (err) {
            console.log(err);
            return res.json({ "success": false, "msg": err.message });
        }
        if (!recipient) {
            res.json({ "success": false, "msg": "Invaild User ID" });
        } else {
            var donors = [];
            if (recipient.donors)
                donors = recipient.donors;

            let new_donor = {
                "email": req.body.email,
                "name": req.body.name,
                "phone": req.body.phone,
                "loan": req.body.loan,
                "connected": false
            }
            donors.push(new_donor);
            Recipientschema.update({ id: req.params.id }, { donors: donors }, function(err) {
                if (err) {
                    console.log(err);
                    return res.json({ "success": false, "msg": err.message });
                }
                console.log("Added new donor");
                res.json({ "success": true, "msg": "Success" });
            })
        }
    });
});

router.get('/recipient/get_donors/:id', function(req, res) {
    Recipientschema.get({ id: req.params.id }, function(err, recipient) {
        if (err) {
            console.log(err);
            return res.json({ "success": false, "msg": err.message });
        }
        if (!recipient) {
            res.json({ "success": false, "msg": "Invaild User ID" });
        } else {
            res.json({ "success": true, "msg": "Success", "donors": recipient.donors });
        }
    });
});

router.post('/recipient/get_donor/:id', function(req, res) {
    Recipientschema.get({ id: req.params.id }, function(err, recipient) {
        if (err) {
            console.log(err);
            return res.json({ "success": false, "msg": err.message });
        }
        if (!recipient) {
            return res.json({ "success": false, "msg": "Invaild User ID" });
        } else {
            console.log(req.body.donor_email);
            var recipient_loan = null;
            var recipient_donor = null;
            for (var i = 0; i < recipient.donors.length; i++) {
                if (recipient.donors[i].email == req.body.donor_email) {
                    recipient_donor = recipient.donors[i];
                    if (recipient_donor.connected == false) {
                        return res.json({ "success": false, "msg": "No Connected this Donor" });
                    }
                    break;
                }
            }
            if (recipient_donor == null) {
                return res.json({ "success": false, "msg": "Unable to find Donor" });
            }
            for (var i = 0; i < recipient.loans.length; i++) {
                if (recipient_donor.loan == recipient.loans[i].node_id) {
                    recipient_loan = recipient.loans[i];
                    break;
                }
            }
            if (recipient_loan == null) {
                return res.json({ "success": false, "msg": "Unable to find Assoiciated Loan" });
            }
            Userschema.get({ email: req.body.donor_email }, function(err, user) {
                if (err) {
                    console.log(err);
                    return res.json({ "success": false, "msg": err.message });
                }
                if (!user) {
                    return res.json({ "success": false, "msg": "No Registered this Donor" });
                } else {
                    console.log(user);
                    Donorschema.get({ id: user.user_id }, function(err, donor) {
                        if (err) {
                            return res.json({ "success": false, "msg": err.message });
                        }
                        if (!user) {
                            return res.json({ "success": false, "msg": "Unable to pull Donor User" });
                        } else {
                            var donor_recipient = null;
                            for (var i = 0; i < donor.recipients.length; i++) {
                                if (donor.recipients[i].email == recipient.email)
                                    donor_recipient = donor.recipients[i];
                            }
                            if (donor_recipient == null) {
                                return res.json({ "success": false, "msg": "No Accept this Donor You" });
                            }
                            res.json({
                                "success": true,
                                "msg": "Success",
                                "name": recipient_donor.name,
                                "phone": recipient_donor.phone,
                                "email": recipient_donor.email,
                                "loan_bank_name": recipient_loan.bank_name,
                                "donor_bank_name": donor.bank_name,
                                "count": donor_recipient.count,
                                "balance": donor_recipient.balance
                            });
                        }
                    });
                }
            });
        }
    });
});

router.post('/recipient/update_donor/:id', function(req, res) {
    Recipientschema.get({ id: req.params.id }, function(err, recipient) {
        if (err) {
            console.log(err);
            return res.json({ "success": false, "msg": err.message });
        }
        if (!recipient) {
            return res.json({ "success": false, "msg": "Invaild User ID" });
        } else {
            console.log(recipient);
            console.log(req.body.donor_email);
            console.log(req.body.loan);
            var updated = false;
            for (var i = 0; i < recipient.donors.length; i++) {
                if (recipient.donors[i].email == req.body.donor_email) {
                    recipient.donors[i].loan = req.body.loan;
                    break;
                }
            }
            if (!updated) {
                return res.json({ "success": false, "msg": "Unable to find Donor" });
            }
            Recipientschema.update({ id: req.params.id }, { donors: recipient.donors }, function(err) {
                if (err) {
                    console.log(err);
                    return res.json({ "success": false, "msg": err.message });
                }
                console.log("Reassign new loan");
                res.json({ "success": true, "msg": "Success" });
            })
        }
    });
});

router.get('/recipient/get_loans/:id', function(req, res) {
    Recipientschema.get({ id: req.params.id }, function(err, recipient) {
        if (err) {
            console.log(err);
            return res.json({ "success": false, "msg": err.message });
        }
        if (!recipient) {
            return res.json({ "success": false, "msg": "Invaild User ID" });
        } else {
            console.log(recipient);
            res.json({ "success": true, "msg": "Success", "loans": recipient.loans });
        }
    });
});

router.get('/recipient/get_balances/:id', function(req, res) {
    Recipientschema.get({ id: req.params.id }, function(err, recipient) {
        if (err) {
            console.log(err);
            return res.json({ "success": false, "msg": err.message });
        }
        if (!recipient) {
            return res.json({ "success": false, "msg": "Invaild User ID" });
        }
        /****** get balance from plaid using access_token */
        let options = {
            _id: recipient.synapse_user_id,
            fingerprint: Helpers.fingerprint,
            ip_address: '127.0.0.1',
            full_dehydrate: 'yes' //optional
        };
        var synapse_user;
        Users.get(
            Helpers.client,
            options,
            function(errResp, userResponse) {
                // error or user object
                if (errResp) {
                    return res.json({ "success": false, "msg": "Unable to pull Synapse User" });
                }
                synapse_user = userResponse;
                Nodes.get(
                    synapse_user,
                    null,
                    function(err, nodesResponse) {
                        if (err) {
                            return res.json({ "success": false, "msg": "Unable to pull Synapse Node Balance" });
                        }
                        console.log(nodesResponse.nodes);
                        // error or array of node objects
                        var loan_balances = [];
                        for (var i = 0; i < nodesResponse.nodes.length; i++) {
                            loan_balances[i] = {
                                "node_id": nodesResponse.nodes[i]._id,
                                "bank_name": nodesResponse.nodes[i].info.bank_name,
                                "balance": nodesResponse.nodes[i].info.balance.amount
                            };
                        }
                        var parameters = [];
                        if (!recipient.donors) {
                            return res.json({ "success": true, "msg": "No Donors", "loans": loan_balances, "donors": [] });
                        }
                        for (var i = 0; i < recipient.donors.length; i++) {
                            if (recipient.donors[i].connected) {
                                parameters.push({ "email": recipient.donors[i].email });
                            }
                        }
                        if (parameters.length < 1) {
                            return res.json({ "success": true, "msg": "No Donors", "loans": loan_balances, "donors": [] });
                        }
                        console.log(parameters);
                        Userschema.batchGet(parameters, function(err, users) {
                            if (err) {
                                console.log(err);
                                return res.json({ "success": false, "msg": err.message });
                            }
                            if (!users) {
                                return res.json({ "success": false, "msg": "Invaild Donors" });
                            }
                            parameters = [];
                            for (var i = 0; i < users.length; i++) {
                                parameters.push({ "id": users[i].user_id });
                            }
                            console.log(parameters);
                            Donorschema.batchGet(parameters, function(err, donors) {
                                if (err) {
                                    console.log(err);
                                    return res.json({ "success": false, "msg": err.message });
                                }
                                if (!donors) {
                                    return res.json({ "success": false, "msg": "Invaild Donors" });
                                }
                                console.log(donors);
                                var donor_balances = [];
                                for (var i = 0; i < donors.length; i++) {
                                    for (var j = 0; j < donors[i].recipients.length; j++) {
                                        if (donors[i].recipients[j].email == recipient.email) {
                                            for (var k = 0; k < recipient.donors.length; k++) {
                                                if (recipient.donors[k].email == donors[i].email) {
                                                    donor_balances.push({ "email": recipient.donors[k].email, "name": recipient.donors[k].name, "balance": donors[i].recipients[j].balance });
                                                    break;
                                                }
                                            }
                                        }
                                    }
                                }
                                res.json({ "success": true, "msg": "Success", "loans": loan_balances, "donors": donor_balances });
                            });
                        })
                    });
            });
    });
});

/************************ Donor ******************/
router.post('/donor/signup', function(req, res) {
    console.log("create donor");
    if (req.body.email && req.body.password) {
        var id = new Date().getTime().toString();
        var register_user = new Userschema({
            email: req.body.email,
            password: req.body.password,
            user_id: id,
            user_type: 'donor'
        });
        register_user.save({
            condition: '#o <> :email',
            conditionNames: { o: 'email' },
            conditionValues: { email: req.body.email }
        }, function(err) {
            if (err) {
                console.log(err);
                res.json({ "success": false, "msg": err.message });
            } else {
                console.log("created donor");
                res.json({ "success": true, "msg": "Successfully created", "user_id": id });
            }
        });
    } else {
        res.json({ "success": false, "msg": "Invalid Parameter" });
    }
});

router.post('/donor/create_account/:id', function(req, res) {
    console.log(req.body);
    if (req.body.email && req.body.name) {
        Userschema.get({ email: req.body.email }, function(err, user) {
            if (err) {
                return res.json({ "success": false, "msg": err.message });
            }
            if (!user) {
                return res.json({ "success": false, "msg": "Invaild User ID" });
            }
            if (user.user_id == req.params.id && !user.has_account) {
                let create_synapse_user = {
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
                        note: 'Donor Synapse user',
                        supp_id: user.user_id,
                        is_business: false
                    }
                };
                /******************* Synapse User create */
                Users.create(
                    Helpers.client,
                    Helpers.fingerprint,
                    Helpers.ip_address,
                    create_synapse_user,
                    function(err, synapse_user) {
                        if (err) {
                            console.log(err);
                            res.json({ "success": false, "msg": "Failed Synapse User Create" });
                        } else {
                            console.log(JSON.stringify(synapse_user));
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
                                if (err) {
                                    console.log(err);
                                    res.json({ "success": false, "msg": err.message });
                                } else {
                                    Userschema.update({ email: req.body.email }, { has_account: true }, function(err) {
                                        if (err) {
                                            console.log(err);
                                            res.json({ "success": false, "msg": err.message });
                                        } else {
                                            console.log("Donor Created" + req.params.id);
                                            res.json({ "success": true, "msg": "Successfully created" });
                                        }
                                    });
                                }
                            })
                        }
                    });
            } else {
                console.log("Error" + req.params.id);
                res.json({ "success": false, "msg": "Invalid User ID" });
            }
        });
    } else {
        res.json({ "success": false, "msg": "Invalid Parameter" });
    }
});

router.post('/donor/bank/:id', function(req, res) {
    /// get donor db from id params
    Donorschema.get({ id: req.params.id }, function(err, donor) {
        if (err) {
            return res.json({ "success": false, "msg": err.message });
        }
        if (!donor) {
            res.json({ "success": false, "msg": "Invaild User ID" });
        } else {
            //// get plaid accunt from publick_token 
            PUBLIC_TOKEN = req.body.public_token;
            console.log(PUBLIC_TOKEN);
            var account_id = req.body.account_id;
            plaid_client.exchangePublicToken(PUBLIC_TOKEN, function(error, tokenResponse) {
                if (error != null) {
                    console.log(msg + '\n' + error);
                    return res.json({ "success": false, "msg": "Failed Get Access Token" });
                }
                ACCESS_TOKEN = tokenResponse.access_token;
                ITEM_ID = tokenResponse.item_id;
                console.log('Access Token: ' + ACCESS_TOKEN);
                console.log('Item ID: ' + ITEM_ID);
                plaid_client.getAuth(ACCESS_TOKEN, function(error, authResponse) {
                    if (error != null) {
                        console.log(msg + '\n' + error);
                        return res.json({ "success": false, "msg": "Unable to pull accounts from the Plaid API." });
                    }
                    console.log(authResponse.accounts);
                    var selected_index;
                    let numbers = authResponse.numbers;
                    for (var i = 0; i < numbers.length; i++) {
                        if (numbers[i].account_id === account_id)
                            selected_index = i;
                    }

                    var ach_Node = {
                        type: 'ACH-US',
                        info: {
                            nickname: 'Slap Donor Bank',
                            account_num: numbers[selected_index].account,
                            routing_num: numbers[selected_index].routing,
                            type: 'PERSONAL',
                            class: 'SAVINGS'
                        },
                        extra: {
                            supp_id: donor.id
                        }
                    };

                    ///get synapse useraccount from synapse_user_id  
                    var node_User;
                    let options = {
                        _id: donor.synapse_user_id,
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
                                res.json({ "success": false, "msg": "Unable to pull User from the synapse_user_id." });
                            } else {
                                node_user = userResponse;
                                /******************   Node user add */
                                Nodes.create(node_user, ach_Node, function(err, nodesResponse) {
                                    if (err) {
                                        res.json({ "success": true, "msg": "Unable to Create Node." });
                                    } else {
                                        console.log('nodesResponse');
                                        console.log(JSON.stringify(nodesResponse));
                                        donor.bank_name = nodesResponse[0].json.info.bank_long_name;
                                        donor.node_id = nodesResponse[0].json._id;
                                        donor.account_id = account_id;
                                        donor.access_token = ACCESS_TOKEN;
                                        donor.save(function(err) {
                                            if (err) {
                                                console.log(err);
                                                return res.json({ "success": false, "msg": err.message });
                                            }
                                            Userschema.update({ email: donor.email }, { has_bank: true }, function(err) {
                                                if (err) {
                                                    console.log(err);
                                                    return res.json({ "success": false, "msg": err.message });
                                                }
                                                console.log("Added Donor Bank");
                                                res.json({ "success": true, "msg": "Success" });
                                            })
                                        });
                                    }
                                });
                            }
                        });
                });
            });
        }
    });
});

router.get('/donor/get_profile/:id', function(req, res) {
    Donorschema.get({ id: req.params.id }, function(err, user_profile) {
        if (err) {
            return res.json({ "success": false, "msg": err.message });
        }
        if (!user_profile) {
            return res.json({ "success": false, "msg": "Invaild User ID" });
        } else {
            return res.json({ "success": false, "msg": "success", "user": user_profile });
        }
    });
});

router.post('/donor/update_profile/:id', function(req, res) {
    Donorschema.get({ id: req.params.id }, function(err, user_profile) {
        if (err) {
            return res.json({ "success": false, "msg": err.message });
        }
        if (!user_profile) {
            return res.json({ "success": false, "msg": "Invaild User ID" });
        } else {
            user_profile.adress = req.body.address;
            user_profile.name = req.body.name;
            user_profile.birthday = req.body.birthday;
            user_profile.state = req.body.state;
            user_profile.phone = req.body.phone;
            user_profile.save(function(err) {
                if (err) {
                    return res.json({ "success": false, "msg": err.message });
                }
                return res.json({ "success": true, "msg": "success" });
            });
        }
    });
});

router.post('/donor/add_recipient/:id', function(req, res) {
    Userschema.get({ email: req.body.email }, function(err, user) {
        if (err) {
            return res.json({ "success": false, "msg": err.message });
        }
        if (!user) {
            return res.json({ "success": false, "msg": "No Registed Recipient" });
        }
        Recipientschema.get({ id: user.user_id }, function(err, recipient) {
            if (err) {
                return res.json({ "success": false, "msg": err.message });
            }
            if (!recipient) {
                return res.json({ "success": false, "msg": "No Registed Recipient" });
            }
            var connected = false;
            if (!recipient.donors) {
                return res.json({ "success": false, "msg": "No Register Donor" });
            }
            Donorschema.get({ id: req.params.id }, function(err, donor) {
                if (err) {
                    return res.json({ "success": false, "msg": err.message });
                }
                if (!donor) {
                    return res.json({ "success": false, "msg": "Invalid User ID" });
                }
                var recipients = [];
                if (donor.recipients) {
                    recipients = donor.recipients;
                }
                for (var i = 0; i < recipient.donors.length; i++) {
                    if (recipient.donors[i].email == donor.email) {
                        connected = true;
                        recipient.donors[i].connected = true;
                        break;
                    }
                }
                if (connected) {
                    var new_recipient = { "email": req.body.email, "name": req.body.name, "count": 0, balance: 0, next: req.body.payment };
                    recipients.push(new_recipient);
                    donor.recipients = recipients;
                    donor.save(function(err) {
                        if (err) {
                            return res.json({ "success": false, "msg": err.message });
                        }
                        recipient.save(function(err) {
                            if (err) {
                                return res.json({ "success": false, "msg": err.message });
                            }
                            res.json({ "success": true, "msg": "Success" });
                        });
                    });
                } else {
                    return res.json({ "success": false, "msg": "No Register Donor" });
                }
            });
        });
    });
});

router.post('/donor/change_next_payment/:id', function(req, res) {
    Donorschema.get({ id: req.params.id }, function(err, donor) {
        if (err) {
            return res.json({ "success": false, "msg": err.message });
        }
        if (!donor) {
            return res.json({ "success": false, "msg": "Invalid User ID" });
        } else {
            for (var i = 0; i < donor.recipients.length; i++) {
                if (donor.recipients[i].email == req.body.email) {
                    donor.recipients[i].next = req.body.next;
                    break;
                }
            }
            donor.save(function(err) {
                if (err) {
                    return res.json({ "success": false, "msg": err.message });
                }
                return res.json({ "success": true, "msg": "success" });
            })

        }
    });
});

router.get('/donor/get_recipients/:id', function(req, res) {
    Donorschema.get({ id: req.params.id }, function(err, donor) {
        if (err) {
            return res.json({ "success": false, "msg": err.message });
        }
        if (!donor) {
            return res.json({ "success": false, "msg": "Invalid User ID" });
        } else {
            return res.json({ "success": true, "msg": "success", "recipients": donor.recipients, "next_payment": donor.next_payment });
        }
    });
});

router.post('/donor/remove_recipient/:id', function(req, res) {
    Donorschema.get({ id: req.params.id }, function(err, donor) {
        if (err) {
            return res.json({ "success": false, "msg": err.message });
        }
        if (!donor) {
            return res.json({ "success": false, "msg": "Invalid User ID" });
        }
        for (var i = 0; i < donor.recipients.length; i++) {
            if (donor.recipients[i].email == req.body.email) {
                donor.recipients.splice(i, 1);
                break;
            }
        }
        donor.save(function(err) {
            if (err) {
                return res.json({ "success": false, "msg": err.message });
            }
            Userschema.get({ email: req.body.email }, function(err, user) {
                if (err) {
                    return res.json({ "success": false, "msg": err.message });
                }
                if (!user) {
                    return res.json({ "success": false, "msg": "No Registed user" });
                }
                Recipientschema.get({ id: user.user_id }, function(err, recipient) {
                    for (var i = 0; i < recipient.donors.length; i++) {
                        if (recipient.donors[i].email == donor.email) {
                            recipient.donors[i].connected = false;
                            console.log("removed");
                            break;
                        }
                    }
                    console.log(donor.email + req.body.email);
                    recipient.save(function(err) {
                        if (err) {
                            return res.json({ "success": false, "msg": err.message });
                        }
                        return res.json({ "success": true, "msg": "Success" });
                    })
                })
            })
        })
    });
});

router.post('/donor/get_balances/:id', function(req, res) {
    Donorschema.get({ id: req.params.id }, function(err, donor) {
        if (err) {
            return res.json({ "success": false, "msg": err.message });
        }
        if (!donor) {
            return res.json({ "success": false, "msg": "Invalid User ID" });
        }
        return res.json({ "success": true, "msg": "Success", "next_payment": donor.next_payment, "recipients": donor.next_payment });
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
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
                console.log(user);
                const addDocsPayload = {
                    documents: [{
                        email: 'donor4@mail.com',
                        phone_number: '9107952280',
                        ip: Helpers.ip_address,
                        name: 'Dhfhh donor4',
                        alias: 'Woof Woof',
                        entity_type: 'M',
                        entity_scope: 'Arts & Entertainment',
                        day: 29,
                        month: 3,
                        year: 1985,
                        address_street: '201 n front street',
                        address_city: 'Wilmington',
                        address_subdivision: 'CA',
                        address_postal_code: '28401',
                        address_country_code: 'US',
                        virtual_docs: [{
                            document_value: '2222',
                            document_type: 'SSN'
                        }],
                        physical_docs: [{
                            // use url to base64 helper
                            document_value: 'data:image/gif;base64,SUQs==',
                            document_type: 'GOVT_ID'
                        }]
                    }]
                };

                user.addDocuments(
                    addDocsPayload,
                    function(err, userResponse1) {
                        // error or user object
                        if (err) {
                            return res.json(err);
                        }
                        console.log("success");
                        res.json(userResponse1);
                    }
                );

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

router.post('/add_document/:id', function(req, res) {
    const addDocsPayload = {
        documents: [{
            email: 'donor1@mail.com',
            phone_number: '9107952280',
            ip: Helpers.ip_address,
            name: 'Donor donor',
            alias: 'Woof Woof',
            entity_type: 'M',
            entity_scope: 'Arts & Entertainment',
            day: 29,
            month: 3,
            year: 1985,
            address_street: '201 n front street',
            address_city: 'Wilmington',
            address_subdivision: 'CA',
            address_postal_code: '28401',
            address_country_code: 'US',
            virtual_docs: [{
                document_value: '2222',
                document_type: 'SSN'
            }]
        }]
    };

    user.addDocuments(
        addDocsPayload,
        function(err, userResponse) {
            // error or user object
            user = userResponse;
        }
    );
})

router.get('/', function(req, res) {
    res.json({ 'result': 'API RUNNING' });
});

// alpha API

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

router.post('/transactions/:id', function(req, res) {
    Donorschema.get({ id: req.params.id }, function(err, donor_user) {
        if (err) {
            res.json({ "success": false, "msg": "Error" });
        } else {
            for (var i = 0; i < donor_user.recipients.length; i++) {
                Userschema.get({ email: donor_user.recipients[i].email }, function(err, user) {
                    if (err) {
                        return res.json({ "success": false, "msg": err.message });
                    }
                    if (!user) {
                        return res.json({ "success": false, "msg": "Invaild User ID" });
                    } else {
                        Recipientschema.get({ id: user.user_id }, function(err, recipient) {
                            if (err) {
                                return res.json({ "success": false, "msg": err.message });
                            }
                            if (!user) {
                                return res.json({ "success": false, "msg": "Invaild User ID" });
                            } else {
                                for (var j = 0; j < recipient.donors.length; j++) {
                                    if (recipient.donors[j].email == donor_user.email) {
                                        var createPayload = {
                                            to: {
                                                type: 'ACH-US',
                                                id: recipient.donors[j].loan
                                            },
                                            amount: {
                                                amount: 10,
                                                currency: 'USD'
                                            },
                                            extra: {
                                                note: 'Deposit from  ' + donor_user.name + ' to  ' + recipient.name,
                                                ip: Helpers.ip_address
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
                                                if (err) { return res.json({ "success": false, "msg": err.message }); }
                                                testUser = user;
                                                Nodes.get(
                                                    testUser, {
                                                        _id: donor_user.node_id
                                                    },
                                                    function(err, node) {
                                                        if (err) { return res.json({ "success": false, "msg": err.message }); }
                                                        testNode = node;
                                                        console.log(testNode);
                                                        Transactions.create(
                                                            testNode,
                                                            createPayload,
                                                            function(err, transaction) {
                                                                if (err) { return res.json({ "success": false, "msg": err.message }); }
                                                                if (i == donor_user.recipients.length) {
                                                                    res.json({ "success": true, "transaction": transaction });
                                                                }
                                                            }
                                                        );
                                                    }
                                                );
                                            });
                                    }
                                }
                            }
                        });
                    }
                });
            }

        }
    });
});

router.post('/add_document/:id', function(req, res) {
    const addDocsPayload = {
        documents: [{
            email: 'donor1@mail.com',
            phone_number: '9107952280',
            ip: Helpers.ip_address,
            name: 'Donor donor',
            alias: 'Woof Woof',
            entity_type: 'M',
            entity_scope: 'Arts & Entertainment',
            day: 29,
            month: 3,
            year: 1985,
            address_street: '201 n front street',
            address_city: 'Wilmington',
            address_subdivision: 'CA',
            address_postal_code: '28401',
            address_country_code: 'US',
            virtual_docs: [{
                document_value: '2222',
                document_type: 'SSN'
            }]
        }]
    };

    user.addDocuments(
        addDocsPayload,
        function(err, userResponse) {
            // error or user object
            user = userResponse;
        }
    );

})


// real API

router.post('/signin', function(req, res) {
    console.log(req.body);
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
    console.log(req.body);
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
    if (req.body.email && req.body.name && req.body.birthday && req.body.ssn && req.body.phone &&
        req.body.address && req.body.city && req.body.state && req.body.zip) {
        var birthday = new Date(req.body.birthday);
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
                        note: 'Recipient User',
                        supp_id: user.user_id,
                        is_business: false
                    },
                    documents: [{
                        email: req.body.email,
                        phone_number: req.body.phone,
                        ip: Helpers.ip_address,
                        name: req.body.name,
                        alias: 'Recipient User',
                        entity_type: 'M',
                        entity_scope: 'Arts & Entertainment',
                        day: birthday.getDay,
                        month: birthday.getMonth,
                        year: birthday.getFullYear,
                        address_street: req.body.address,
                        address_city: req.body.city,
                        address_subdivision: req.body.state,
                        address_postal_code: req.body.zip,
                        address_country_code: 'US',
                        virtual_docs: [{
                            document_value: req.body.ssn,
                            document_type: 'SSN'
                        }],
                        physical_docs: [{
                            // use url to base64 helper
                            document_value: 'data:image/gif;base64,SUQs==',
                            document_type: 'GOVT_ID'
                        }]
                    }]
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
                            /********** Recipient DB Create */
                            var recipient = new Recipientschema({
                                id: user.user_id,
                                email: req.body.email,
                                phone: req.body.phone,
                                name: req.body.name,
                                birthday: req.body.birthday,
                                address: req.body.address,
                                city: req.body.city,
                                state: req.body.state,
                                zip: req.body.zip,
                                ssn: req.body.ssn,
                                synapse_user_id: synapse_user.json._id,
                                document_id: synapse_user.json.documents.id
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

router.post('/recipient/add_loan/:id', function(req, res) {
    console.log(req.body);
    if (req.body.public_token && req.body.account_id && req.body.account_name) {
        // get recipient db from id params
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
                                nickname: req.body.account_name,
                                account_num: numbers[selected_index].account,
                                routing_num: numbers[selected_index].routing,
                                type: 'PERSONAL',
                                class: 'SAVINGS'
                            }
                        };

                        ///get synapse useraccount from synapse_user_id  
                        var node_User;
                        let options = {
                            _id: recipient.synapse_user_id,
                            fingerprint: Helpers.fingerprint,
                            ip_address: Helpers.getUserIP(),
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
                                            res.json({ "success": false, "msg": "Unable to Create Node." });
                                        } else {
                                            console.log('nodesResponse');
                                            console.log(JSON.stringify(nodesResponse));
                                            /*const microPayload = {
                                                micro: [0.1, 0.1]
                                            };

                                            var node = nodesResponse[0];

                                            node.update(
                                                microPayload,
                                                function(err, nodeResponse) {
                                                    console.log("micro deposits created");
                                                }
                                            );*/
                                            var node_obj = [];
                                            if (recipient.loans)
                                                node_obj = recipient.loans;
                                            // node_obj.push(recipient.loans);
                                            let node_options_new = {
                                                node_id: nodesResponse[0].json._id,
                                                bank_name: nodesResponse[0].json.info.bank_name,
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
    } else {
        res.json({ "success": false, "msg": "Invalid Parameter" });
    }
});

router.post('/recipient/add_donor/:id', function(req, res) {
    console.log(req.body);
    if (req.body.name && req.body.email && req.body.phone && req.body.loan) {
        Recipientschema.get({ id: req.params.id }, function(err, recipient) {
            if (err) {
                console.log(err);
                return res.json({ "success": false, "msg": err.message });
            }
            if (!recipient) {
                res.json({ "success": false, "msg": "Invaild User ID" });
            } else {
                var donors = [];
                if (recipient.donors) {
                    donors = recipient.donors;
                }

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
    } else {
        res.json({ "success": false, "msg": "Invalid Parameter" });
    }
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
    console.log(req.body);
    if (req.body.donor_email) {
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
    } else {
        res.json({ "success": false, "msg": "Invalid Parameter" });
    }
});

router.post('/recipient/update_donor/:id', function(req, res) {
    console.log(req.body);
    if (req.body.donor_email && req.body.loan) {
        Recipientschema.get({ id: req.params.id }, function(err, recipient) {
            if (err) {
                console.log(err);
                return res.json({ "success": false, "msg": err.message });
            }
            if (!recipient) {
                return res.json({ "success": false, "msg": "Invaild User ID" });
            } else {
                console.log(recipient);
                for (var i = 0; i < recipient.donors.length; i++) {
                    if (recipient.donors[i].email == req.body.donor_email) {
                        recipient.donors[i].loan = req.body.loan;
                        break;
                    }
                }
                recipient.save(function(err) {
                    if (err) {
                        console.log(err);
                        res.json({ "success": false, "msg": err.message });
                    } else {
                        console.log("Reassign new loan");
                        res.json({ "success": true, "msg": "Success" });
                    }
                })
            }
        });
    } else {
        res.json({ "success": false, "msg": "Invalid Parameter" });
    }
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
            ip_address: Helpers.getUserIP(),
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
    console.log(req.body);
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
    if (req.body.email && req.body.name && req.body.birthday && req.body.ssn && req.body.phone &&
        req.body.address && req.body.city && req.body.state && req.body.zip) {
        var birthday = new Date(req.body.birthday);
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
                        note: 'Donor User',
                        supp_id: user.user_id,
                        is_business: false
                    },
                    documents: [{
                        email: req.body.email,
                        phone_number: req.body.phone,
                        ip: Helpers.ip_address,
                        name: req.body.name,
                        alias: 'Donor User',
                        entity_type: 'M',
                        entity_scope: 'Arts & Entertainment',
                        day: birthday.getDay,
                        month: birthday.getMonth,
                        year: birthday.getFullYear,
                        address_street: req.body.address,
                        address_city: req.body.city,
                        address_subdivision: req.body.state,
                        address_postal_code: req.body.zip,
                        address_country_code: 'US',
                        virtual_docs: [{
                            document_value: req.body.ssn,
                            document_type: 'SSN'
                        }],
                        physical_docs: [{
                            // use url to base64 helper
                            document_value: 'data:image/gif;base64,SUQs==',
                            document_type: 'GOVT_ID'
                        }]
                    }]

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
                            /********** Donor DB Create */
                            var donor = new Donorschema({
                                id: user.user_id,
                                email: req.body.email,
                                phone: req.body.phone,
                                name: req.body.name,
                                birthday: req.body.birthday,
                                address: req.body.address,
                                city: req.body.city,
                                state: req.body.state,
                                zip: req.body.zip,
                                ssn: req.body.ssn,
                                synapse_user_id: synapse_user.json._id,
                                document_id: synapse_user.json.documents.id
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
                res.json({ "success": false, "msg": "Invalid User ID" });
            }
        });
    } else {
        res.json({ "success": false, "msg": "Invalid Parameter" });
    }
});

router.post('/donor/bank/:id', function(req, res) {
    console.log(req.body);
    if (req.body.public_token && req.body.account_id && req.body.account_name) {
        // get donor db from id params
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

                        let ach_Node = {
                            type: 'ACH-US',
                            info: {
                                nickname: req.body.account_name,
                                account_num: numbers[selected_index].account,
                                routing_num: numbers[selected_index].routing,
                                type: 'PERSONAL',
                                class: 'SAVINGS'
                            }
                        };

                        ///get synapse useraccount from synapse_user_id  
                        var node_User;
                        let options = {
                            _id: donor.synapse_user_id,
                            fingerprint: Helpers.fingerprint,
                            ip_address: Helpers.getUserIP(),
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
                                            res.json({ "success": false, "msg": "Unable to Create Node." });
                                        } else {
                                            console.log('nodesResponse');
                                            console.log(JSON.stringify(nodesResponse));
                                            /*const microPayload = {
                                                micro: [0.1, 0.1]
                                            };

                                            var node = nodesResponse[0];

                                            node.update(
                                                microPayload,
                                                function(err, nodeResponse) {
                                                    if (err) {
                                                        console.log("err");
                                                    }
                                                    console.log("micro deposits created");
                                                }
                                            );*/
                                            donor.node_id = nodesResponse[0].json._id;
                                            donor.bank_name = nodesResponse[0].json.info.bank_name;
                                            donor.access_token = ACCESS_TOKEN;
                                            donor.account_id = account_id;
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
    } else {
        res.json({ "success": false, "msg": "Invalid Parameter" });
    }
});

router.post('/donor/add_recipient/:id', function(req, res) {
    console.log(req.body);
    if (req.body.name && req.body.email && req.body.payment) {
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
    } else {
        res.json({ "success": false, "msg": "Invalid Parameter" });
    }
});

router.post('/donor/change_next_payment/:id', function(req, res) {
    console.log(req.body);
    if (req.body.email && req.body.next) {
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
    } else {
        res.json({ "success": false, "msg": "Invalid Parameter" });
    }
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
    console.log(req.body);
    if (req.body.email) {
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
    } else {
        res.json({ "success": false, "msg": "Invalid Parameter" });
    }
});

module.exports = router;

function intervalFunc() {
    var time_date = new Date();
    console.log('Cant stop me now!' + time_date.getHours() + '/' + time_date.getMinutes() + '/' + time_date.getSeconds());
}

setInterval(intervalFunc, 50000);
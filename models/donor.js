var dynamoose = require('dynamoose');
dynamoose.AWS.config.loadFromPath('./config.json');

var Schema = dynamoose.Schema;

var donorSchema = new Schema({
    id: {
        type: String,
        required: true,
        hashKey: true
    },
    email: {
        type: String,
        required: true
    },
    name: {
        type: String,
        required: true
    },
    phone: {
        type: String,
        required: true
    },
    birthday: {
        type: String
    },
    address: {
        type: String
    },
    city: {
        type: String
    },
    state: {
        type: String
    },
    zip: {
        type: String
    },
    ssn: {
        type: String
    },
    synapse_user_id: {
        type: String
    },
    document_id: {
        type: String
    },
    bank_name: {
        type: String
    },
    node_id: {
        type: String
    },
    account_id: {
        type: String
    },
    access_token: {
        type: String
    },
    internal_node_id: {
        type: String
    },
    next_payment: {
        type: String
    },
    recipients: {
        type: Object
    }
}, {
    throughput: { read: 15, write: 10 }
});

module.exports = dynamoose.model('Donor', donorSchema);
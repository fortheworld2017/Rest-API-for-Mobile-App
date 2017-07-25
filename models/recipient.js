var dynamoose = require('dynamoose');
dynamoose.AWS.config.loadFromPath('./config.json');

var Schema = dynamoose.Schema;

var recipientSchema = new Schema({
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
    synapse_user_id: {
        type: String
    },
    loans: {
        type: Object
    },
    donors: {
        type: Object
    }
}, {
    throughput: { read: 15, write: 5 }
});

module.exports = dynamoose.model('Recipient', recipientSchema);
var dynamoose = require('dynamoose');
dynamoose.AWS.config.loadFromPath('./config.json');

var Schema = dynamoose.Schema;

var profileSchema = new Schema({
    id: {
        type: String,
        required: true,
        hashKey: true
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
    }
}, {
    throughput: { read: 15, write: 5 }
});

module.exports = dynamoose.model('UserProfile', profileSchema);
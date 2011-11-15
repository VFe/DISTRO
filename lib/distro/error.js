var ClientError = exports.ClientError = function(message){
	this.message = message;
}
ClientError.prototype = new Error;
ClientError.prototype.constructor = ClientError;
ClientError.prototype.name = 'DISTROClientError';
(function() {
    return {
        data: {
            email: '',
            lastFiveTicketArray: [],
            callArray: [],
            userData: [],
            ticketData: []
        },

        events: {
            'app.created':'init',
            'fetchUserData.done': 'historyHandleUserResults',
            'requiredProperties.ready': 'historyGetUserData',
            'fetchUserData.done': 'adminLinkFetchComplete'
        },

        requests: {
            fetchUserData: function(userID) {
                return {
                    url: helpers.fmt("/api/v2/users/%@/tickets/requested.json?sort_order=desc", userID),
                    dataType: 'json'
                };
            },
            fetchUserData: function(id){
                return {
                    url: helpers.fmt("/api/v2/users/%@.json?include=identities", id),
                    type: 'GET',
                    dataType: 'json',
                    proxy_v2: true
                };
            }
        },

        init: function(data) {
            var self = this;

            var requesterId = self.ticket().requester().id();
            self.ajax('fetchUserData', requesterId);

            if (!data.firstLoad) {
                return;
            }
            _.defer((function() {
                this.trigger('requiredProperties.ready');
            }).bind(self));
        },

        historyGetUserData: function() {
            this.ajax( 'fetchUserData', this.ticket().requester().id() );
        },

        adminLinkFetchComplete: function(data) {
            var self = this;

            self.data.email = data.user.email;
            //console.log(data);

            self.displayUpdate();
        },

        historyHandleUserResults: function(data) {
            var self = this;
            var lastestFive = _.first(data.tickets, 5).sort(function(a,b) {
                var aID = a.id;
                var bID = b.id;
                return (aID === bID) ? 0 : (aID < bID) ? 1 : -1;
            });
            var calls ={
                week: 0,
                month: 0
            };
            //console.log(data);
            for (var j = 0; j < data.tickets.length; j++){
                if(data.tickets[j].via.channel === 'api' && (data.tickets[j].via.source.rel === 'inbound' || data.tickets[j].via.source.rel === 'outbound' || data.tickets[j].via.source.rel == 'voicemail')) {
                    if (moment(data.tickets[j].created_at).add(7, 'days').isBefore(/*now*/)){

                    } else {
                        calls.week++;
                    }

                }
                if(data.tickets[j].via.channel === 'api' && (data.tickets[j].via.source.rel === 'inbound' || data.tickets[j].via.source.rel === 'outbound' || data.tickets[j].via.source.rel == 'voicemail')) {
                    if (moment(data.tickets[j].created_at).add(30, 'days').isBefore(/*now*/)){

                    } else {
                        calls.month++;
                    }
                }
            }

            self.data.lastFiveTicketArray = lastestFive;
            self.data.callArray = calls;

            self.displayUpdate();
        },

        safeGetPath: function(propertyPath) {
            return _.inject(propertyPath.split('.'), function(context, segment) {
                if (context == null) { return context; }
                var obj = context[segment];
                if ( _.isFunction(obj) ) { obj = obj.call(context); }
                return obj;
            }, this);
        },

        displayUpdate: function() {
            var self = this,
                templatePayload = {};
            if (self.data.email != null) {
                templatePayload.adminLink = 'https://admin.ring.com/UI/index.html#/customers/' + self.data.email;
                templatePayload.adminLinkText = 'Go to the Admin Panel';
            } else {
                templatePayload.adminLink = '';
                templatePayload.adminLinkText = 'Malformed or Missing Email';
            }

            templatePayload.lastestFiveArr = self.data.lastFiveTicketArray;
            templatePayload.calls = self.data.callArray;

            self.switchTo('main', templatePayload);
        },

        validateRequiredProperty: function(propertyPath) {
            var value = this.safeGetPath(propertyPath);
            return value != null && value !== '' && value !== 'no';
        }
    };
}());

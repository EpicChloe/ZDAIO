(function() {
    return {
        data: {
            email: ''
        },

        events: {
            'app.activated':'init',
            'historyFullUserData.done': 'historyHandleUserResults',
            'requiredProperties.ready': 'historyGetUserData',
            'adminLinkFetchUser.done': 'adminLinkFetchComplete'
        },

        requests: {
            historyFullUserData: function(userID) {
                return {
                    url: helpers.fmt("/api/v2/users/%@/tickets/requested.json?sort_order=desc", userID),
                    dataType: 'json'
                };
            },
            adminLinkFetchUser: function(id){
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
            self.ajax('adminLinkFetchUser', requesterId);

            if (!data.firstLoad) {
                return;
            }
            _.defer((function() {
                this.trigger('requiredProperties.ready');
            }).bind(self));
        },

        historyGetUserData: function() {
            this.ajax( 'historyFullUserData', this.ticket().requester().id() );
        },

        adminLinkFetchComplete: function(data) {
            var self = this;

            self.data.email = data.user.email;
            console.log(data);
        },

        historyHandleUserResults: function(data) {
            var lastestFive = _.first(data.tickets, 5).sort(function(a,b) {
                var aID = a.id;
                var bID = b.id;
                return (aID === bID) ? 0 : (aID < bID) ? 1 : -1;
            });
            var calls ={
                week: 0,
                month: 0
            };
            console.log(data);
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
            if (data.user.email != null) {
                this.switchTo('main', {link: 'https://admin.ring.com/UI/index.html#/customers/' + data.user.email, text: 'Go to the Admin Panel'});
            } else {
                this.switchTo('main', {link: ' ', text: 'Malformed or Missing Email'});
            }
            this.switchTo('main', {
                lastestFiveArr: lastestFive,
                calls: calls
            });
        },

        safeGetPath: function(propertyPath) {
            return _.inject(propertyPath.split('.'), function(context, segment) {
                if (context == null) { return context; }
                var obj = context[segment];
                if ( _.isFunction(obj) ) { obj = obj.call(context); }
                return obj;
            }, this);
        },

        validateRequiredProperty: function(propertyPath) {
            var value = this.safeGetPath(propertyPath);
            return value != null && value !== '' && value !== 'no';
        }
    };
}());
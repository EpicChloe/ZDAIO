(function() {
    return {
        data: {
            visible: '',
            email: '',
            validEmail: true,
            lastFiveTicketArray: [],
            callArray: [],
            userData: [],
            ticketCount: []
        },

        events: {
            'app.created':'init',

            'fetchUserHistory.done': 'handleTicketData',
            'fetchUserData.done': 'handleUserData',

            'mp_fetchUserViaEmail.done': 'parseMPUserProfile',
            'mp_fetchUserActivityViaEmail.done': 'parseMPUserActivity',

            'click .toggle-app': 'toggleAppContainer',
            'click #RAIOGoToAdmin': 'RAIO_UI_ClickAdmin',
            'click #RAIOMixPanelTabToggle': 'RAIO_UI_MixPanelActive',
            'click #RAIOHomeTabToggle': 'RAIO_UI_HomeActive'
        },

        requests: {
            fetchUserHistory: function(userID) {
                return {
                    url: helpers.fmt("/api/v2/users/%@/tickets/requested.json?sort_order=desc", userID),
                    type: 'GET',
                    dataType: 'json',
                    proxy_v2: true
                };
            },
            fetchUserData: function(id){
                return {
                    url: helpers.fmt("/api/v2/users/%@.json?include=identities", id),
                    type: 'GET',
                    dataType: 'json',
                    proxy_v2: true
                };
            },
            mp_fetchUserViaEmail: function(email){
                return {
                    url: 'https://mixpanel.com/api/2.0/jql',
                    cors: true,
                    type: 'POST',
                    dataType: 'json',
                    headers: {
                        "content-type": "application/x-www-form-urlencoded",
                        "authorization": "Basic "
                    },
                    data: {script: helpers.fmt('function main() { return People().filter(function(user){return user.properties.$email == "%@"})}', email)}
                };
            },
            mp_fetchUserActivityViaEmail: function(email){
                return {
                    url: 'https://mixpanel.com/api/2.0/jql',
                    cors: true,
                    type: 'POST',
                    dataType: 'json',
                    headers: {
                        "content-type": "application/x-www-form-urlencoded",
                        "authorization": "Basic "
                    },
                    data: {script: helpers.fmt('function main() {return Events({from_date: "' + moment().subtract(3, 'days').format("YYYY-M-D") + '",to_date: "' + moment().format("YYYY-M-D") + '"}).filter(function(event) {return event.distinct_id == "%@";});}', email)}
                };
            }
        },

        init: function() {
            var self = this;

            var requesterId = self.ticket().requester().id();
            self.ajax('fetchUserData', requesterId);
            self.ajax('fetchUserHistory', requesterId);

            self.data.visible = this.store('_RAIOAPP');

            if (self.data.visible == null) {
                self.data.visible = true;
                this.store('_RAIOAPP', true);
            }
            
            var $container = this.$('.app-container'),
                $icon = this.$('.toggle-app i');
            if (!self.data.visible){
                $container.hide();
                $icon.prop('class', 'icon-chevron-right');
                this.$('#RAIOActions').addClass('hidden');

            } else {
                $container.show();
                $icon.prop('class', 'icon-chevron-down');
                this.$('#RAIOActions').removeClass('hidden');
            }

        },

        handleUserData: function(data) {
            var self = this;

            self.data.email = data.user.email;
            console.log(data);

            self.data.userData = data.user;

            self.ajax( 'mp_fetchUserViaEmail', self.data.email);
            self.ajax( 'mp_fetchUserActivityViaEmail', self.data.email);

            self.data.validEmail = self.validateEmail(self.data.email);

            self.displayUpdate();
        },

        handleTicketData: function(data) {
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

            var ticketCount = {
                new: data.tickets.reduce(function(n, ticket) {return n + (ticket.status === 'new');}, 0),
                open: data.tickets.reduce(function(n, ticket) {return n + (ticket.status === 'open');}, 0),
                pending: data.tickets.reduce(function(n, ticket) {return n + (ticket.status === 'pending');}, 0),
                hold: data.tickets.reduce(function(n, ticket) {return n + (ticket.status === 'hold');}, 0),
                solved: data.tickets.reduce(function(n, ticket) {return n + (ticket.status === 'solved');}, 0),
                closed: data.tickets.reduce(function(n, ticket) {return n + (ticket.status === 'closed');}, 0)
            };

            for (var j = 0; j < data.tickets.length; j++){
                if(data.tickets[j].via.channel === 'api' && (data.tickets[j].via.source.rel === 'inbound' || data.tickets[j].via.source.rel === 'outbound' || data.tickets[j].via.source.rel === 'voicemail')) {
                    if (moment(data.tickets[j].created_at).add(7, 'days').isBefore(/*now*/)){

                    } else {
                        calls.week++;
                    }

                }
                if(data.tickets[j].via.channel === 'api' && (data.tickets[j].via.source.rel === 'inbound' || data.tickets[j].via.source.rel === 'outbound' || data.tickets[j].via.source.rel === 'voicemail')) {
                    if (moment(data.tickets[j].created_at).add(30, 'days').isBefore(/*now*/)){

                    } else {
                        calls.month++;
                    }
                }
            }

            self.data.lastFiveTicketArray = lastestFive;
            self.data.callArray = calls;
            self.data.ticketCount = ticketCount;

            self.displayUpdate();
        },

        parseMPUserProfile: function(data) {
            console.log('-- Mixpanel User Profile --');
            console.log(data);
            console.log('----------');
        },

        parseMPUserActivity: function(data) {
            console.log('-- Mixpanel User Activity --');
            console.log(data);
            console.log('----------');
        },

        toggleAppContainer: function(){
            var $container = this.$('.app-container'),
                $icon = this.$('.toggle-app i');
            if ($container.is(':visible')){
                $container.hide();
                $icon.prop('class', 'icon-chevron-right');
                this.$('#RAIOActions').addClass('hidden');
                this.store('_RAIOAPP', false);
            } else {
                $container.show();
                $icon.prop('class', 'icon-chevron-down');
                this.$('#RAIOActions').removeClass('hidden');
                this.store('_RAIOAPP', true);
            }
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
            templatePayload.tickets = self.data.ticketCount;
            templatePayload.user = self.data.userData;
            templatePayload.validEmail = self.data.validEmail;

            console.log(templatePayload);
            self.switchTo('main', templatePayload);

        },

        RAIO_UI_ClickAdmin: function(event) {
            event.preventDefault();
            if (this.$('#RingAdminLink').text() !== 'Go to the Admin Panel') {
                services.notify('Malformed or Missing Email', 'error', {sticky: true});
            } else {
                this.$('#RingAdminLink').trigger('click');
            }

        },

        RAIO_UI_MixPanelActive: function(event) {
            event.preventDefault();
            this.$('.tab').addClass('hidden');
            this.$('#RAIOMixpanelTab').removeClass('hidden');
            this.$('#RAIOMixPanelTabToggle').parent().addClass('hidden');
            this.$('#RAIOHomeTabToggle').parent().removeClass('hidden');
        },

        RAIO_UI_HomeActive: function(event) {
            event.preventDefault();
            this.$('.tab').addClass('hidden');
            this.$('#RAIOHomeTab').removeClass('hidden');
            this.$('#RAIOHomeTabToggle').parent().addClass('hidden');
            this.$('#RAIOMixPanelTabToggle').parent().removeClass('hidden');
        },


        validateEmail: function (email) {


            var validation1 = /^[^@\s]+@talkdesk.com$/i.test(email),
                validation2 = /^(([^<>()\[\]\.,;:\s@\"]+(\.[^<>()\[\]\.,;:\s@\"]+)*)|(\".+\"))@(([^<>()\.,;\s@\"]+\.{0,1})+[^<>()\.,;:\s@\"]{2,})$/.test(email);

            console.log("Email Validation1: "+validation1+" Email Validation2: "+validation2);

            return (!validation1 && validation2);
        }


    };
}());

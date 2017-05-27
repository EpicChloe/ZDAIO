(function() {
    return {
        data: {
            visible: '',
            email: '',
            validEmail: true,
            lastFiveTicketArray: [],
            callArray: [],
            userData: [],
            ticketCount: [],
            MPUserProfile: [],
            MPActivity: [],
            appSettings: {},
            activeDisplay: ''
        },

        events: {
            'app.created':'init',

            'fetchUserHistory.done': 'handleTicketData',
            'fetchUserData.done': 'handleUserData',

            'mp_fetchUserViaEmail.done': 'parseMPUserProfile',
            'mp_fetchUserViaEmail.fail': 'failureHandlerMPEmail',
            'mp_fetchUserActivityViaEmail.done': 'parseMPUserActivity',
            'mp_fetchUserActivityViaEmail.fail': 'failureHandlerMPActivity',

            'click .toggle-app': 'toggleAppContainer',
            'click #RAIOGoToAdmin': 'RAIO_UI_ClickAdmin',
            'click #RAIOMixPanelUserTabToggle': 'RAIO_UI_MixPanelActive',
            'click .refresh-mp-userdata': 'RAIO_UI_MixPanelActive',
            'click #RAIOHomeTabToggle': 'RAIO_UI_HomeActive',
            'click #RAIOMixPanelActivityToggle': 'RAIO_UI_MixpanelActivity',

        },

        requests: {
            fetchUserHistory: function(userID) {
                return {
                    url: helpers.fmt("/api/v2/users/%@/tickets/requested.json?sort_order=desc", userID),
                    type: 'GET',
                    dataType: 'json'
                };
            },
            fetchUserData: function(id){
                return {
                    url: helpers.fmt("/api/v2/users/%@.json?include=identities", id),
                    type: 'GET',
                    dataType: 'json'
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
                        "authorization": this.data.appSettings.MPAuth
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
                        "authorization": this.data.appSettings.MPAuth
                    },
                    data: {script: helpers.fmt('function main() {return Events({from_date: "' + moment().subtract(3, 'days').format("YYYY-M-D") + '",to_date: "' + moment().format("YYYY-M-D") + '"}).filter(function(event) {return event.distinct_id == "%@";});}', email)}
                };
            }
        },

        init: function(data) {
            var self = this;

            if (!data.firstLoad) {
                self.RAIO_UI_Reset();
            }

            var requesterId = self.ticket().requester().id();

            self.data.appSettings = require('settings');

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

            self.data.userData = data.user;

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
            var self = this;

            console.log('-- Mixpanel User Profile --');
            console.log(data);
            console.log('----------');

            self.data.MPUserProfile = [];

            if (data[0].properties['$ios_app_version'] != null) {
                self.data.MPUserProfile.push({key:'iOS Device', value:data[0].properties['$ios_device_model']});
                self.data.MPUserProfile.push({key:'App Version', value:data[0].properties['$ios_app_version']});
            }

            if (data[0].properties['$android_app_version'] != null) {
                self.data.MPUserProfile.push({key:'Android Model', value:data[0].properties['$android_model'], tooltip:data[0].properties['$android_manufacturer']});
                self.data.MPUserProfile.push({key:'Android OS', value:data[0].properties['$android_os_version']});
                self.data.MPUserProfile.push({key:'App Version', value:data[0].properties['$android_app_version']});
            }

            self.data.MPUserProfile.push({key:'Allowing Location', value:data[0].properties['Allowing Location']});
            self.data.MPUserProfile.push({key:'Allowing Microphone', value:data[0].properties['Allowing Microphone']});
            self.data.MPUserProfile.push({key:'Allowing Notifications', value:data[0].properties['Allowing Notifications']});
            self.data.MPUserProfile.push({key:'Latest Setup Device Type', value:data[0].properties['Latest Setup Device Type']});
            self.data.MPUserProfile.push({key:'Latest Setup Result', value:data[0].properties['Latest Setup Result']});

            self.$('#mp-user-refresh-icon').removeClass('spin');
            self.data.activeDisplay = 'userProfile';
            self.displayUpdate();
        },

        parseMPUserActivity: function(data) {
            var self = this;

            console.log('-- Mixpanel User Activity --');
            console.log(data);
            console.log('----------');

            self.data.MPActivity = [];

            var lastTenEvents = _.first(data, 10).sort(function(a,b) {
                var aID = a.time;
                var bID = b.time;
                return (aID === bID) ? 0 : (aID < bID) ? 1 : -1;
            });

            _.each(lastTenEvents, function(data) {
                self.data.MPActivity.push({
                    title:data.name,
                    dataSet:[
                        {'key': 'Event Type', 'value': data.properties['Event Type']},
                        {'key': 'OS', 'value': data.properties.$os + ': ' + data.properties.$os_version},
                        {'key': 'App Version', 'value': data.properties.$app_version},
                        {'key': 'Model Phone', 'value': data.properties.$manufacturer + ' ' + data.properties.$app_version},
                        {'key': 'Carrier', 'value': data.properties.$carrier},
                        {'key': 'Radio', 'value': data.properties.$radio},
                        {'key': 'Wifi', 'value': data.properties.$wifi},
                        {'key': 'Allowing Location', 'value': data.properties['Allowing Location']},
                        {'key': 'Allowing Microphone', 'value': data.properties['Allowing Microphone']},
                        {'key': 'Allowing Notifications', 'value': data.properties['Allowing Notifications']}
                    ]
                });
            }.bind(self));

            console.log(self.data.MPActivity);

            self.displayUpdate('userActivity');
        },

        failureHandlerMPEmail: function() {
            var self = this;

            services.notify('Error in Fetching Additional User Data. Retrying in 5 seconds.', 'error');

            setTimeout(function() {
                self.ajax('mp_fetchUserViaEmail', self.data.email);
            }.bind(self), 5000);
        },

        failureHandlerMPActivity: function() {
            var self = this;

            services.notify('Error in Fetching Additional User Data. Retrying in 5 seconds.', 'error');

            setTimeout(function() {
                self.ajax( 'mp_fetchUserActivityViaEmail', self.data.email);
            }.bind(self), 5000);
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

        displayUpdate: function(tab) {
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
            templatePayload.MPUserProfile = self.data.MPUserProfile;
            templatePayload.MPActivity = self.data.MPActivity;

            //console.log(templatePayload);
            self.switchTo('main', templatePayload);

            if(self.data.activeDisplay === 'userProfile') {
                this.$('.tab').addClass('hidden');
                this.$('#RAIOMixpanelUserTab').removeClass('hidden');
                this.$('#RAIOMixPanelUserTabToggle').parent().addClass('hidden');
                this.$('#RAIOHomeTabToggle').parent().removeClass('hidden');
            }

            if(tab === 'userActivity') {
                this.$('.jGrowl-notification').html('');
                this.$('#RAIOMixpanelActivityModal').modal('show');
            }

            // Accordion Support
            self.$(".set > a").on("click", function(e){
                if(self.$(this).hasClass('active')){
                    self.$(this).removeClass("active");
                    self.$(this).siblings('.content').slideUp(200);
                }else{
                    self.$(".set > a").removeClass("active");
                    self.$(this).addClass("active");
                    self.$('.content').slideUp(200);
                    self.$(this).siblings('.content').slideDown(200);
                }
                (e).preventDefault();
            });

        },

        RAIO_UI_Reset: function() {
            var self = this;
            self.data.activeDisplay = '';
            self.displayUpdate();
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
            var self = this;
            event.preventDefault();
            this.$('.tab').addClass('hidden');
            this.$('#RAIOMixpanelUserTab').removeClass('hidden');
            this.$('#RAIOMixPanelUserTabToggle').parent().addClass('hidden');
            this.$('#RAIOHomeTabToggle').parent().removeClass('hidden');

                self.ajax('mp_fetchUserViaEmail', self.data.email);
                self.$('#mp-user-refresh-icon').addClass('spin');

        },

        RAIO_UI_MixpanelActivity: function(event) {
            var self = this;

            event.preventDefault();

            services.notify('Fetching User Activity...','notice');

            self.ajax( 'mp_fetchUserActivityViaEmail', self.data.email);
        },

        RAIO_UI_HomeActive: function(event) {
            event.preventDefault();
            this.$('.tab').addClass('hidden');
            this.$('#RAIOHomeTab').removeClass('hidden');
            this.$('#RAIOHomeTabToggle').parent().addClass('hidden');
            this.$('#RAIOMixPanelUserTabToggle').parent().removeClass('hidden');
            self.data.activeDisplay = '';
        },

        validateEmail: function (email) {


            var validation1 = /^[^@\s]+@talkdesk.com$/i.test(email),
                validation2 = /^(([^<>()\[\]\.,;:\s@\"]+(\.[^<>()\[\]\.,;:\s@\"]+)*)|(\".+\"))@(([^<>()\.,;\s@\"]+\.{0,1})+[^<>()\.,;:\s@\"]{2,})$/.test(email);

            //console.log("Email Validation1: "+validation1+" Email Validation2: "+validation2);

            return (!validation1 && validation2);
        }


    };
}());

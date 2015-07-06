app.config(function($stateProvider) {
    $stateProvider.state('aRoom', {
        url: '/room/:id',
        templateUrl: 'js/rooms/aRoom.html',
        controller: 'SingleRoomCtrl',
        resolve: {
            VideoObj: function(VideoFactory, $stateParams) {
                return VideoFactory.getVideoObjectId($stateParams.id)
                    .then(function(video) {
                        return video;
                    });
            },
            user: function(AuthService) {
                return AuthService.getLoggedInUser().then(function(user) {
                    return user
                })
            }
        }
    });
});



app.controller('SingleRoomCtrl', function($scope, $rootScope, user, VideoObj, CommentFactory, VideoFactory, AuthService) {
    $scope.user = user
    $scope.video = VideoObj;
    $scope.clicked = false;
    $scope.comments = VideoObj.comments.sort(function(a, b) {
        if (a.videoTime < b.videoTime) return -1
        else if (a.videoTime > b.videoTime) return 1
        else return 0
    })
    $scope.oneAtATime = true;
    $scope.isLoggedIn = AuthService.isAuthenticated();
    $scope.displayComments = []
    $scope.interval;
    $scope.displaying = []
    $scope.clicked = false;
    AuthService.getLoggedInUser().then(function(user) {
        $scope.user = user;
    });
    $scope.display = false;
    var refresher;

    $rootScope.$on('duration', function(event, player) {
        $scope.duration = player.getDuration()
    })
    $scope.changeInterval = function(number) {
        $scope.interval = number * 1000
        var lowerbound = 0 - (number / 2)
        var upperbound = 0 + (number / 2)
        var bucket = 0
        for (var i = 0; i < $scope.comments.length; i++) {
            if (!$scope.displayComments[bucket]) $scope.displayComments[bucket] = []
            if ((lowerbound < $scope.comments[i].videoTime) && ($scope.comments[i].videoTime < upperbound)) {
                $scope.displayComments[bucket].push($scope.comments[i])
            } else {
                i--
                $scope.displayComments[bucket].push()
                bucket += 1
                lowerbound += number
                upperbound += number
            }
        }
        $scope.displaying = $scope.displayComments[0]
    }
    $scope.changeInterval(5)
    $rootScope.$on('status', function(event, player) {
        if (player.getPlayerState() === 1) {
            window.clearInterval(refresher)
            refresher = window.setInterval(function() {
                $rootScope.$emit('playing', player.getCurrentTime())
            }, $scope.interval)
        } else if (player.getPlayerState() === 3) {
            var x = Math.floor(player.getCurrentTime / ($scope.interval / 1000))
            $scope.displaying = $scope.displayComments[x]
            console.log('hi', $scope.displaying)
        } else {
            console.log(player.getPlayerState())
            window.clearInterval(refresher)
            refresher = undefined
        }
    })

    $rootScope.$on('playing', function(event, currentTime) {
        var x = Math.floor(currentTime / ($scope.interval / 1000))
        $scope.displaying = $scope.displayComments[x]
        console.log(x, currentTime, $scope.displaying, 'x')
        $scope.$digest();
    })

    $scope.showForm = function() {
        $scope.clicked = true;
        VideoFactory.pauseVid();
    };

    $scope.hideForm = function() {
        $scope.clicked = false
    }
    $scope.getReplies = function(parent) {
        CommentFactory.getReplies(parent._id).then(function(replies) {
            replies.sort(function(a, b) {
                return parseFloat(b.rating) - parseFloat(a.rating);
            });
            $scope.children = replies;
        });
    }

    $scope.addingComment = function(comment) {
        console.log(comment)
        comment = {
            user: $scope.user._id,
            title: $scope.comment.title,
            videoTime: VideoFactory.getCurTime(),
            content: $scope.comment.content,
            tags: $scope.comment.tags
        }
        CommentFactory.saveComment(comment).then(function(comment) {
            VideoFactory.addCommentToVid(comment, $scope.video._id).then(function(video) {
                $scope.comments = video.comments;
                $scope.comment = null
            }).catch(console.log);
        });
        $scope.hideForm();

    }
});
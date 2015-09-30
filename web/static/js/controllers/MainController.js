app.controller('MainController', function($scope, $http, $window, ngDialog, $interval, $cookies, $timeout) {
	$scope.title = 'Wording';
	$scope.Object = Object;
	$scope.apiAdress = 'http://127.0.0.1:5000';

	window.onload = function() {
		$scope.addUserUrls();
		$scope.addListUrls();

		var content = document.getElementById('content');
		content.addEventListener('click', function(event) {
			if ($scope.showProfileInfo == true) {
				event.preventDefault();
				$scope.showProfileInfo = false;
			}
		});
	};

	$scope.sizeOf = function(obj) {
		return Object.keys(obj).length;
	};

	// Profile info state
	$scope.showProfileInfo = false;

	$scope.error = null;
	$scope.isOwner = true;
	$scope.loggedIn = $cookies.get('loggedIn') ? $cookies.get('loggedIn') : false;
	$scope.user = $cookies.getObject('user') ? $cookies.getObject('user') : {
		token	:	"",

		username:	"",
		password:	"",
		confirmPassword: "",
		email	:	"",
		friends	: 	""
	};
	$scope.userData = {
		username: "",
		email: "",
		lists: []
	}
	$scope.editData = {
		listname: "",
		language_1_tag: "",
		language_2_tag: "",
		shared_with: "",
		words: []
	};
	$scope.importData = {
		name: "",
		language1: "",
		language2: ""
	};
	$scope.request = {
		friend: ""
	};

	// Language variable
	$scope.languages = {
		prefferedLanguage : $cookies.get('language') ? $cookies.get('language') : "eng",
		availableLanguages : ["eng", "dut", "ger"]
	}

	// load translations from translations.json
	$http.get('/translations.json').then(function(result) {
		console.log(result.data[$scope.languages.prefferedLanguage])
		$scope.translations = result.data[$scope.languages.prefferedLanguage];
	});

	// Switch language on page
	$scope.switchLanguage = function(newLanguage) {
		if (newLanguage != undefined)
			$scope.languages.prefferedLanguage = newLanguage;
		$http.get('/translations.json').then(function(result) {
			$scope.translations = result.data[$scope.languages.prefferedLanguage];
		});

		var now = new Date();
    	// this will set the expiration to 12 months
    	var exp = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());

    	// Remove older cookie
    	$cookies.remove('language');
    	// Set new cookie
    	$cookies.put('language', $scope.languages.prefferedLanguage, { expires : exp });
	};

	// Check if language is available
	$scope.languageAvailable = function(value, index, array) {
		return ($scope.languages.availableLanguages.indexOf(value.iso) != -1)
	}

	// Toggle show profile
	$scope.toggleShowProfile = function() {
		$scope.showProfileInfo = !$scope.showProfileInfo
	}

	// Dialogs
	$scope.openSignUp = function() {
		ngDialog.open({
			template:'\
				<h1>[[ translations.login.signup ]]</h1><br>\
				<p ng-if="error" class="error">[[ error ]]</p>\
				<form ng-submit="registerUser()">\
					<table>\
						<tr>\
							<td>[[ translations.login.username ]]: </td>\
							<td><input type="text" ng-model="user.username" name="username" placeholder="[[ translations.login.username ]]"></td>\
						</tr>\
						<tr>\
							<td>[[ translations.login.password ]]: </td>\
							<td><input type="password" ng-model="user.password" name="password" placeholder="[[ translations.login.password ]]"></td>\
						</tr>\
						<tr>\
							<td></td>\
							<td><input type="password" ng-model="user.confirmPassword" name="confirm_password" placeholder="[[ translations.login.confirmPassword ]]"></td>\
						</tr>\
						<tr>\
							<td>[[ translations.login.email ]]: </td>\
							<td><input type="email" ng-model="user.email" name="email" placeholder="[[ translations.login.email ]]"></td>\
						</tr>\
					</table>\
					<input type="submit" value="[[ translations.login.signup ]]">\
				</form>',
			plain:true,
			scope:$scope
		});
	};
	$scope.openLogIn = function() {
		ngDialog.open({
			template:'\
				<h1>[[ translations.login.login ]]</h1><br>\
				<p ng-if="error" class="error">[[ error ]]</p>\
				<form ng-submit="loginUser()">\
					<table>\
						<tr>\
							<td>[[ translations.login.username ]]: </td>\
							<td><input type="text" ng-model="user.username" name="username" placeholder="[[ translations.login.username ]]"></td>\
						</tr>\
						<tr>\
							<td>[[ translations.login.password ]]: </td>\
							<td><input type="password" ng-model="user.password" name="password" placeholder="[[ translations.login.password ]]"></td>\
						</tr>\
					</table>\
					<input type="submit" value="[[ translations.login.login ]]"> <a ng-click="openSignUp()">[[ translations.login.option ]]</a>\
				</form>',
			plain:true,
			scope:$scope
		});
	};

	// Authentication functions
	$scope.authenticate = function(username, password) {
		var data = {
			'username':username,
			'password':password
		};
		$http.post($scope.apiAdress + '/authenticate', data)
			.success(function(data, status, headers, config) {
				if (typeof data == "string") {
					if (data == 'ERROR, Email not verified') $scope.error = $scope.translations.errors.emailNotVerified;
				} else {
					$scope.user.token = data.token;
					$scope.user.friends = data.friends;
					$scope.loggedIn = true;
					$scope.loadUser("/" + $scope.user.username);

					// First delete before saving cookies
					$cookies.remove('user');
					$cookies.remove('loggedIn');
					// Save Cookies
					$cookies.put('loggedIn', $scope.loggedIn);
					$cookies.putObject('user', $scope.user);

					ngDialog.closeAll();
					$scope.error = null;
				}
			}).error(function(data, status, headers, config) {
				console.error("could not authenticate");
				// If error is 401 display it...
				if (status == 401) $scope.error = $scope.translations.errors.validation;
				else $scope.error = $scope.translations.errors.unknown;
			});
	};

	$scope.registerUser = function() {
		if ($scope.user.username && $scope.user.password && $scope.user.email) {
			if ($scope.user.password == $scope.user.confirmPassword) {
				data = {
					'username':this.user.username,
					'password':this.user.password,
					'email':this.user.email
				};
				$http.post($scope.apiAdress + '/register', data)
					.success(function(data, status, headers, config) {
						if (data.indexOf("ERROR") > - 1) {
							// An error...
							if (data == "ERROR, not everything filled in") {
								$scope.error = $scope.translations.errors.notEverythingFilledIn;
							} else if (data == "ERROR, username and/or email do already exist") {
								$scope.error = $scope.translations.errors.alreadyExist;
							}
						} else {
							// Give success
							console.log("Verify email");
							ngDialog.close('registerDialog');
							$scope.error = null;
						}
						console.log($scope.error);
					}).error(function(data, status, headers, config) {
						// Give registration error
						console.error("Failed");
						$scope.error = $scope.translations.errors.unknown;
					});
				// Reset the values
				$scope.user.password = '';
				$scope.user.confirmPassword = '';
			} else $scope.error = $scope.translations.errors.noMatch;
		} else $scope.error = $scope.translations.errors.notEverythingFilledIn;
	};

	$scope.loginUser = function() {
		console.log('Start logging in');
		if ($scope.user.username && $scope.user.password) {
			$scope.authenticate(this.user.username, this.user.password);
			// Reset the fields
			$scope.user.password = '';
		} else $scope.error = $scope.translations.errors.notEverythingFilledIn;
	};

	$scope.logoutUser = function() {
		$scope.loggedIn = false;
		$scope.showProfileInfo = false;
		$scope.user.username = '';
		$scope.user.token = '';
		$scope.user.email = '';

		// Remove the cookies
		$cookies.remove('user');
		$cookies.remove('loggedIn');

		// Need function to go to main page
	};

	// json loading functions
	// Password list for users that are in the database
	// cor 		Hunter2
	// leon		all_i_see_is_*****
	// philip	***hunter***
	$scope.loadUser = function(url){
		$http.post($scope.apiAdress + url, { 'token':$scope.user.token })
			.success(function(data, status, headers, config) {
				if (data.username == 'ERROR, No token' || data.username == 'ERROR, No user') {
					// Show login screen
					$scope.openLogIn();
				} else {
					window.history.pushState(null, null, url);
					document.getElementById('right_content').style.display = 'none';
					$scope.userData = data;
					$scope.listData = 0;
					$scope.addListUrls();
				}
			})
			.error(function(data, status, headers, config) {
				console.log("error");
			});
	};

	$scope.loadList = function(url){
		$scope.usedWords = [];
		$scope.incorrectWords = [];

		$timeout(function(){
			showList();
			if ($scope.userData.username != $scope.user.username) $scope.isOwner = false;
			else $scope.isOwner = true;
		}, 0);

		var data = {
			"token" : $scope.user.token
		}

		$http.post($scope.apiAdress + url, data)
			.success(function(data, status, headers, config) {
				$scope.listData = data;
			})
			.error(function(data, status, headers, config) {
				console.log("error");
			});
	};

	window.onpopstate = function(){
		document.getElementById('practice_div').style.display = 'none';
		document.getElementById('left_content').style.display = 'block';
		document.getElementById('middle_content').style.display = 'block';

		if (location.pathname.split('/').length == 2){
			$scope.loadUser(location.pathname);
		}

		else if (location.pathname.split('/').length == 3){
			$scope.loadList(location.pathname);
		}
	}

	$scope.addUserUrls = function() {
		var userLinks = document.getElementsByClassName('user_link');

		for(var i = 0, x = userLinks.length; i < x; i++){
			$scope.addUserUrl(userLinks[i]);
		}		
	}

	$scope.addListUrls = function() {
		var listLinks = document.getElementsByClassName('list_link');

		$timeout(function() { // Fixing it by doing this doesn't feel good, but now it works ¯\_(ツ)_/¯
			for(var i = 0, x = listLinks.length; i < x; i++) {
				$scope.addListUrl(listLinks[i]);
			}
		}, 0);
	}

	$scope.addUserUrl = function(link){
		link.addEventListener('click', function(e){
			var url = link.href.split('/').pop();
			e.preventDefault();
			console.log(url);
			$scope.loadUser('/' + url);
		}, false);
	};

	$scope.addListUrl = function(link){
		link.addEventListener('click', function(e){
			var url = link.href.split('/').slice(-2);
			e.preventDefault();
			history.pushState(null, null, '/' + url[0] + '/' + url[1]);
			$scope.loadList('/' + url[0] + '/' + url[1]);
		}, false);
	};

	// Create list
	$scope.createList = function() {
		$scope.editData = {
			listname: "",
			language_1_tag: "",
			language_2_tag: "",
			words: [],
			shared_with: "",
		};

		for (i = 0; i < 3; i++) {
			$scope.editData.words[i] = {
				language_1_text: "",
				language_2_text: ""
			}
		}
	};

	$scope.importList = function() {
		ngDialog.open({
			template: '\
				<h1>[[ translations.import.title ]]</h1><br>\
				<p>[[ translations.import.desc ]]</p>\
				<table>\
					<tr>\
						<td>[[ translations.import.name ]]: </td>\
						<td><input type="text" ng-model="importData.name"></td>\
					</tr>\
					<tr>\
						<td>[[ translations.import.language1 ]]: </td>\
						<td>\
							<select ng-model="importData.language1" value="">\
								<option value="">[[ translations.listControls.language1 ]]</option>\
								<option ng-repeat="language in translations.languages" value="[[ language.iso ]]">[[ language.displayText ]]</option>\
							</select>\
						</td>\
					</tr>\
					<tr>\
						<td>[[ translations.import.language2 ]]: </td>\
						<td>\
							<select ng-model="importData.language2" value="">\
								<option value="">[[ translations.listControls.language2 ]]</option>\
								<option ng-repeat="language in translations.languages" value="[[ language.iso ]]">[[ language.displayText ]]</option>\
							</select>\
						<td>\
					</tr>\
					<tr>\
						<td>[[ translations.sharing.sharedWith ]]? </td>\
						<td>\
							<select ng-model="importData.shared_with" value="">\
								<option value="">[[ translations.sharing.sharedWith ]]?</option>\
								<option value="0">[[ translations.sharing.nobody ]]</option>\
								<option value="1">[[ translations.friends ]]</option>\
								<option value="2">[[ translations.sharing.everybody ]]</option>\
							</select>\
						</td>\
					</tr>\
				</table>\
				<textarea id="import_area" name="" cols="30" rows="10"></textarea>\
				<button ng-click="submitImportedList()">[[ translations.import.title ]]</button>\
			',
			plain:true,
			scope:$scope
		});
	}

	$scope.submitImportedList = function() {
		document.getElementById('undo_delete').style.display = 'none';
		var words = document.getElementById('import_area').value.split(/ = |=|\n/g);
		var wordObjectArray = [];
		console.log(wordObjectArray)
		for (var i = 0, x = words.length; i < x; i+=2){
			wordObjectArray.push({
				language_1_text: words[i],
				language_2_text: words[i+1]
			});
		}

		console.log(words);
		$scope.editData = {
			listname: $scope.importData.name,
			language_1_tag: $scope.importData.language1,
			language_2_tag: $scope.importData.language2,
			words: wordObjectArray
		}

		console.log($scope.editData);

		$scope.saveList();
		ngDialog.close();
	}

	$scope.editList = function() {
		document.getElementById('undo_delete').style.display = 'none';
		$scope.editData = $scope.listData;

		var size = $scope.sizeOf($scope.editData.words);
		for (i = 0; i < 3; i++) {
			$scope.editData.words[size] = {
				language_1_text: "",
				language_2_text: ""
			};
		}
	};

	$scope.saveList = function() {
		var data = {
			'username':$scope.user.username,
			'list_data':$scope.editData,
			'token':$scope.user.token
		};
		console.log(data);
		$http.post($scope.apiAdress + '/savelist', data)
			.success(function(data, status, headers, config) {
				console.log('saved');
				$scope.loadUser('/' + $scope.userData.username);
				$scope.loadList('/' + $scope.userData.username + '/' + $scope.editData.listname);
				$scope.editData = null;

				if (!$scope.isOwner) {
					alert("Edited list saved on own account.")
				}
			}).error(function(data, status, headers, config) {
				console.error('error');
			});
	};

	$scope.deleteList = function(listname) {
		document.getElementById('undo_delete').style.display = 'block';
		$scope.editData = $scope.listData;
		var data = {
			'username':$scope.userData.username,
			'listname':listname,
			'token':$scope.user.token
		};
		$http.post($scope.apiAdress + '/deleteList', data)
			.success(function(data, status, headers, config) {
				$scope.loadUser('/' + $scope.userData.username);
				listData = null;
				editData = null;
			}).error(function(data, status, headers, config){
				console.error('Error while deleting list')
			});
	};

	$scope.undoDelete = function() {
		document.getElementById('undo_delete').style.display = 'none';
		$scope.saveList();
	}

	// Start practice
	$scope.startList = function(){
		$http.get('/translations.json').then(function(result) {
			$scope.translations = result.data[$scope.languages.prefferedLanguage];
			for(var i = 0, x = $scope.translations.languages.length; i < x; i++){
				if ($scope.translations.languages[i].iso == $scope.listData.language_1_tag){
					$scope.firstLanguage = $scope.translations.languages[i].displayText;
				}

				else if ($scope.translations.languages[i].iso == $scope.listData.language_2_tag){
					$scope.secondLanguage = $scope.translations.languages[i].displayText;
				}
			}

			ngDialog.open({
				template:'\
					<h1>[[ translations.practice.options ]]</h1>\
					<br>\
					[[ translations.practice.questionedLanguage ]]?<br>\
					<form>\
						<input type="radio" name="language" value="second" id="secondLanguage" checked> ' + $scope.secondLanguage + '\
						<br>\
						<input type="radio" name="language" value="first" id="firstLanguage"> ' + $scope.firstLanguage + '\
						<br>\
						<input type="radio" name="language" value="both" id="bothLanguages"> [[ translations.practice.both ]]\
						<br>\
						<input type="submit" ng-click="chooseLanguage()" value="[[ translations.practice.start ]]">\
						<br>\
					</form>\
					',
				plain:true,
				scope:$scope,
				closeByEscape: false,
				closeByDocument: false,
				showClose: false
			});

			showPractice();
		});


		$scope.getRandomWord();
		$scope.numberOfQuestions = $scope.listData.words.length;
		document.getElementById('words_left').innerHTML = $scope.numberOfQuestions;
	};

	$scope.chooseLanguage = function(){
		if (document.getElementById('firstLanguage').checked) {
			$scope.questionedLanguage = true;
		}

		else if (document.getElementById('secondLanguage').checked){
			$scope.questionedLanguage = false;
		}

		else if (document.getElementById('bothLanguages').checked){
			document.getElementById('words_left').innerHTML *= 2;
			for (var i = 0, x = $scope.listData.words.length; i < x; i++){
				$scope.listData.words.push({
					language_1_text: $scope.listData.words[i].language_2_text,
					language_2_text: $scope.listData.words[i].language_1_text
				});
			}
		}

		ngDialog.close();
	};

	// Practice lists
	$scope.getRandomWord = function(){
		if ($scope.usedWords.length == $scope.listData.words.length){
			showResults();
			setResult($scope.numberOfQuestions, $scope.incorrectWords.length);
			return true;
		}

		if($scope.listData){
			$scope.randomWord = $scope.listData.words[Math.floor(Math.random() * $scope.listData.words.length)];

			if ($scope.usedWords.indexOf($scope.randomWord) > -1){
				$scope.getRandomWord();
			}

			else {
				$scope.usedWords.push($scope.randomWord)
			}
		}
	};

	$scope.numberOfQuestions = 0;
	$scope.usedWords = [];
	$scope.incorrectWords = [];

	$scope.submit = function(){
		document.getElementById('wrong_word').innerHTML = '';

		$scope.checkWord(this.text, $scope.randomWord);
		this.text = '';
	};

	$scope.checkWord = function(wordOne, wordTwo){
		wordTwo = $scope.questionedLanguage ? wordTwo.language_2_text : wordTwo.language_1_text

		if(wordOne == wordTwo && wordOne.split(/\s*[,|/|;]\s*/).length < 2){
			$scope.wordIsRight();
		}

		else if (wordTwo.split(/\s*[,|/|;]\s*/).length >= 2){
			var wordOneArray = wordOne.split(/\s*[,|/|;]\s*/);
			var wordTwoArray = wordTwo.split(/\s*[,|/|;]\s*/);
			wordOneArray = wordOneArray.sort();
			wordTwoArray = wordTwoArray.sort();
			console.log(wordOneArray);
			console.log(wordTwoArray);

			for(var i = 0; i < wordOneArray.length; i++){
				if (wordOneArray[i] != wordTwoArray[i]){
					$scope.wordIsWrong(wordOne, wordTwo);
					return false;
				}
			}

			$scope.wordIsRight();
		}

		else {
			$scope.wordIsWrong(wordOne, wordTwo);
		}
	};

	$scope.wordIsRight = function(){
		document.getElementById('words_left').innerHTML--;
		document.getElementById('correct').innerHTML++;
		$scope.getRandomWord();

		return true;
	};

	$scope.wordIsWrong = function(wordOne, wordTwo){
		document.getElementById('words_left').innerHTML++;
		document.getElementById('wrong_word').innerHTML = wordTwo;
		document.getElementById('wrong_word').style.color = 'red';
		if ($scope.usedWords.indexOf(wordTwo) > -1){
			$scope.usedWords.splice($scope.usedWords.indexOf(wordTwo));
		}

		document.getElementById('incorrect').innerHTML++;

		$scope.numberOfQuestions++;
		$scope.incorrectWords.push({
			correctWord: wordTwo,
			incorrectWord: wordOne
		});

		return false;
	};

	// Friends
	$scope.openFriendRequest = function(name) {
		ngDialog.open({
			template: '\
				<h1>Friend request</h1>\
				<form ng-submit="addFriend()">\
					<table>\
						<tr>\
							<td>\
								Friend name:\
							</td>\
							<td>\
								<input type="text" ng-model="request.friend" placeholder="name">\
							</td>\
						</tr>\
					</table>\
					<input type="submit" value="Request">\
				</form>\
			',
			plain: true,
			scope: $scope
		});
	}

	$scope.addFriend = function() {
		// Send friend request
		var data = {
			"username": $scope.user.username,
			"friendname": $scope.request.friend
		}
		$http.post($scope.apiAdress + "/friendRequest", data)
			.success(function(data, status, headers, config) {
				ngDialog.close();
			})
			.error(function(data, status, headers, config) {
				console.error("error");
			});
	}
});

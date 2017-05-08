(() => {
    const app = {
        isLoading: true,
        displayDoneTasks: false,
        visibleCards: new Map(),
        tasks: [],
        spinner: $('.loader'),
        taskTemplate: $('.task-template'),
        doneTaskTemplate: $('.done-task-template'),
        taskContainer: $('.task-list'),
        doneTaskContainer: $('.done-task-list'),
        doneTaskList: $('.done-task-list'),
        doneContainer: $('.done-task-container'),
        showDone: $('.done-task-show'),
        hideDone: $('.done-task-hide'),
        addButton: $('#butAdd'),
        addInput: $('#inpAdd'),
        toggleDoneTasks: $('#inpHid'),
        header: $('.header')
    };

    app.toggleDoneTasks.change(() => {
        app.showDone.toggle();
        app.hideDone.toggle();
        app.doneTaskList.toggle(300);
    });

    app.addTask = () => {
        const value = app.addInput.val().trim();
        if (!value) {
            return;
        }

        const newTask = {
            done: false,
            important: false,
            key: (~~(Math.random() * 1.e5)).toString(),
            label: value,
            created: new Date().toISOString()
        };
        console.log(newTask);
        app.addInput.val('');
        app.addInput.focus();
        app.tasks.push(newTask);
        app.updateTask(newTask);
        app.saveTasks();
    }

    app.addButton.click(app.addTask);
    app.addInput.keypress((event) => {
        if (event.which === 13) {
            app.addTask();
        }
    });

    if (!navigator.onLine) {
        updateNetworkStatus();
    }

    window.addEventListener('online', updateNetworkStatus, false);
    window.addEventListener('offline', updateNetworkStatus, false);

    //To update network status
    function updateNetworkStatus() {
        if (navigator.onLine) {
            app.header.removeClass('offline');
            app.spinner.attr('hidden', true);
        }
        else {
            app.header.addClass('offline');
            app.spinner.removeAttr('hidden');
        }
    }

    /*****************************************************************************
    *
    * Methods to update/refresh the UI
    *
    ****************************************************************************/

    // Updates a weather task with the latest weather forecast. If the task
    // doesn't already exist, it's cloned from the template.
    app.updateTask = (data) => {
        if (!data) {
            return;
        }
        var dataLastUpdated = new Date(data.created);

        var task = app.visibleCards.get(data.key);
        if (!task) {
            if (data.done) {
                task = app.doneTaskTemplate.clone(true);
                task.find('.task-name').text(data.label);
                if (data.important) {
                    task.find('.task-important-image').addClass('task-important-image-checked');
                }
                task.removeClass('done-task-template');
                task.find('.task-checkbox input').one('change', (event) => {
                    setTimeout(() => {
                        const taskIndex = app.tasks.findIndex(element => element.key === data.key);
                        console.log(app.tasks, app.visibleCards);
                        app.tasks[taskIndex].done = false;
                        app.visibleCards.delete(data.key);
                        console.log(app.tasks, app.visibleCards);
                        task.animate({
                            opacity: 0
                        }, 150, () => {
                            task.slideUp(150, () => {
                                task.remove();
                                app.updateTask(app.tasks[taskIndex]);
                            });
                        });
                        app.saveTasks();
                    }, 300);
                });
                task.removeAttr('hidden');
                app.doneTaskContainer.prepend(task);
                app.visibleCards.set(data.key, task);
            } else {
                task = app.taskTemplate.clone(true);
                task.find('.task-name').text(data.label);
                task.removeClass('task-template');
                if (data.important) {
                    task.find('.task-important input').attr('checked', true);
                }
                task.find('.task-checkbox input').one('change', (event) => {
                    setTimeout(() => {
                        const taskIndex = app.tasks.findIndex(element => element.key === data.key);
                        console.log(app.tasks, app.visibleCards);
                        app.tasks[taskIndex].done = true;
                        app.visibleCards.delete(data.key);
                        console.log(app.tasks, app.visibleCards);
                        task.animate({
                            opacity: 0
                        }, 150, () => {
                            task.slideUp(150, () => {
                                task.remove();
                                app.updateTask(app.tasks[taskIndex]);
                            });
                        });
                        app.saveTasks();
                        app.checkDoneTasks();
                        // app.updateTask(app.tasks[taskIndex]);
                    }, 300);
                });
                task.find('.task-important input').change(() => {
                    const taskIndex = app.tasks.findIndex(element => element.key === data.key);
                    app.tasks[taskIndex].important = !app.tasks[taskIndex].important;
                    app.saveTasks();
                    console.log(app.tasks, taskIndex);
                });
                task.removeAttr('hidden');
                app.taskContainer.prepend(task);
                app.visibleCards.set(data.key, task);
            }
        }

        // Verifies the data provide is newer than what's already visible
        // on the task, if it's not bail, if it is, continue and update the
        // time saved in the task
        var taskLastUpdatedElem = task.find('[class*="task-last-updated"]');
        var taskLastUpdated = taskLastUpdatedElem.text();
        if (taskLastUpdated) {
            taskLastUpdated = new Date(taskLastUpdated);
            // Bail if the task has more recent data then the data
            if (dataLastUpdated.getTime() < taskLastUpdated.getTime()) {
                return;
            }
        }
        taskLastUpdatedElem.text(data.created);

        if (app.isLoading) {
            app.spinner.attr('hidden', true);
            app.taskContainer.removeAttr('hidden');
            app.isLoading = false;
        }
    };

    app.checkDoneTasks = () => {
        if (app.displayDoneTasks) {
            return;
        }
        app.displayDoneTasks = app.tasks.some(task => task.done);

        if (app.displayDoneTasks) {
            app.doneContainer.show();
        }
    };

  /*****************************************************************************
   *
   * Methods for dealing with the model
   *
   ****************************************************************************/


  /*
   * Gets a forecast for a specific city and updates the task with the data.
   * getForecast() first checks if the weather data is in the cache. If so,
   * then it gets that data and populates the task with the cached data.
   * Then, getForecast() goes to the network for fresh data. If the network
   * request goes through, then the task gets updated a second time with the
   * freshest data.
   */
  app.getForecast = function(task) {
    const key = task.key;
    const label = task.label;
    const done = task.done;
    const important = task.important;
    var statement = 'select * from weather.forecast where woeid=' + key;
    var url = 'https://query.yahooapis.com/v1/public/yql?format=json&q=' +
        statement;
    // TODO add cache logic here
    if ('caches' in window) {
      /*
       * Check if the service worker has already cached this city's weather
       * data. If the service worker has the data, then display the cached
       * data while the app fetches the latest data.
       */
      caches.match(url).then(function(response) {
        if (response) {
          response.json().then(function updateFromCache(json) {
            var results = json.query.results || {};
            results.key = key;
            results.label = label;
            results.done = done;
            results.important = important;
            results.created = json.query.created;
            app.updateTask(results);
          });
        }
      });
    }
    // Fetch the latest data.
    var request = new XMLHttpRequest();
    request.onreadystatechange = function() {
      if (request.readyState === XMLHttpRequest.DONE) {
        if (request.status === 200) {
          var response = JSON.parse(request.response);
          var results = response.query.results || {};
          results.key = key;
          results.label = label;
          results.done = done;
          results.important = important;
          results.created = response.query.created;
          app.updateTask(results);
        }
      } else {
        // Return the initial weather forecast since no data is available.
        // app.updateTask(initialTask);
      }
    };
    request.open('GET', url);
    request.send();
  };

  // Iterate all of the tasks and attempt to get the latest forecast data
  app.updateForecasts = function() {
    var keys = Object.keys(app.visibleCards);
    keys.forEach(function(key) {
      app.getForecast(key);
    });
  };

    // TODO add saveTasks function here
    // Save list of cities to localStorage.
    app.saveTasks = () => {
        const tasks = JSON.stringify(app.tasks);
        localStorage.setItem('tasks', tasks);
    };

  /*
   * Fake weather data that is presented when the user first uses the app,
   * or when the user has not saved any cities. See startup code for more
   * discussion.
   */
    const initialTask = {
        done: false,
        important: false,
        key: '12345',
        label: 'Just do it!!!',
        created: '2016-07-22T01:00:00Z'
    };
  // TODO uncomment line below to test app with fake data
  // app.updateTask(initialTask);

  /************************************************************************
   *
   * Code required to start the app
   *
   * NOTE: To simplify this codelab, we've used localStorage.
   *   localStorage is a synchronous API and has serious performance
   *   implications. It should not be used in production applications!
   *   Instead, check out IDB (https://www.npmjs.com/package/idb) or
   *   SimpleDB (https://gist.github.com/inexorabletash/c8069c042b734519680c)
   ************************************************************************/

  // TODO add startup code here
    app.tasks = localStorage.getItem('tasks');
    if (app.tasks) {
        try {
            app.tasks = JSON.parse(app.tasks);
        } catch (e) {
            app.tasks = [];
        }
        try {
            app.tasks.forEach(task => app.getForecast(task));
        } catch(e) {}
    } else {
        /* The user is using the app for the first time, or the user has not
        * saved any cities, so show the user some fake data. A real app in this
        * scenario could guess the user's location via IP lookup and then inject
        * that data into the page.
        */
        app.updateTask(initialTask);
        app.tasks = [initialTask];
        app.saveTasks();
    }
    app.checkDoneTasks();
})();

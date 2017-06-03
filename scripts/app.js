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
        header: $('.header'),
        refreshButton: $('#butRefresh')
    };

    app.toggleDoneTasks.change(() => {
        app.showDone.toggle();
        app.hideDone.toggle();
        app.doneTaskList.toggle(300);
    });

    app.sync = function() {
        const url = '/data/';
        $.post({
            url,
            data: `{"tasks": ${JSON.stringify(app.tasks)}}`,
            contentType: 'application/json',
        })
            .fail(redirect);
        console.log(app.tasks);
        $.get(url).done((response) => {
            var results = response || [];
            results.forEach(task => app.updateTask(task));
            app.mergeTasks(results);
            app.saveTasks();

            if (app.isLoading) {
                app.spinner.attr('hidden', true);
                app.taskContainer.removeAttr('hidden');
                app.isLoading = false;
            }
        }).fail(redirect);
    }

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
            last_updated: new Date().toISOString()
        };
        console.log(newTask);
        app.addInput.val('');
        app.addInput.focus();
        app.tasks.push(newTask);
        app.updateTask(newTask);
        app.saveTasks();
        app.sync();
    }

    app.addButton.click(app.addTask);
    app.addInput.keypress((event) => {
        if (event.which === 13) {
            app.addTask();
        }
    });

    app.refreshButton.click(()=>{app.sync();document.location.reload();});

    if (!navigator.onLine) {
        updateNetworkStatus();
    }

    window.addEventListener('online', updateNetworkStatus, false);
    window.addEventListener('offline', updateNetworkStatus, false);

    //To update network status
    function updateNetworkStatus() {
        if (navigator.onLine) {
            app.header.removeClass('offline');
        }
        else {
            app.header.addClass('offline');
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
        var dataLastUpdated = new Date(data.last_updated);

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
                        app.tasks[taskIndex].last_updated = new Date().toISOString();
                        app.visibleCards.delete(data.key);
                        console.log(app.tasks, app.visibleCards);
                        task.animate({
                            opacity: 0
                        }, 150, () => {
                            task.slideUp(150, () => {
                                task.remove();
                                app.updateTask(app.tasks[taskIndex]);
                                app.sync();
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
                        app.tasks[taskIndex].last_updated = new Date().toISOString();
                        app.visibleCards.delete(data.key);
                        console.log(app.tasks, app.visibleCards);
                        task.animate({
                            opacity: 0
                        }, 150, () => {
                            task.slideUp(150, () => {
                                task.remove();
                                app.updateTask(app.tasks[taskIndex]);
                                app.sync();
                            });
                        });
                        app.saveTasks();
                        app.checkDoneTasks();
                    }, 300);
                });
                task.find('.task-important input').change(() => {
                    const taskIndex = app.tasks.findIndex(element => element.key === data.key);
                    app.tasks[taskIndex].important = !app.tasks[taskIndex].important;
                    app.tasks[taskIndex].last_updated = new Date().toISOString();
                    app.saveTasks();
                    app.sync();
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
        taskLastUpdatedElem.text(data.last_updated);

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

    app.mergeTasks = (newTasks) => {
        const resultTasks = [];
        for (const task of app.tasks) {
            const newTask = newTasks.find(item => item.key === task.key);
            const last_updated = new Date(task.last_updated);
            resultTasks.push(newTask && new Date(newTask.last_updated) > last_updated ? newTask : task);
        }
        for (const newTask of newTasks) {
            if (!app.tasks.some(item => item.key === newTask.key)) {
                resultTasks.push(newTask);
            }
        }
        app.tasks = resultTasks;
    };

  /*****************************************************************************
   *
   * Methods for dealing with the model
   *
   ****************************************************************************/

  app.getTasks = function(tasks) {
    var url = '/data/';
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
            var results = json || tasks;
            results.forEach(task => app.updateTask(task));
            app.mergeTasks(results);
            app.saveTasks();

            if (app.isLoading) {
                app.spinner.attr('hidden', true);
                app.taskContainer.removeAttr('hidden');
                app.isLoading = false;
            }
          });
        }
      });
    }
    // Fetch the latest data.
    $.get(url).done((response) => {
        var results = response || [];
        results.forEach(task => app.updateTask(task));
        app.mergeTasks(results);
        app.saveTasks();

        if (app.isLoading) {
            app.spinner.attr('hidden', true);
            app.taskContainer.removeAttr('hidden');
            app.isLoading = false;
        }
    }).fail(redirect);
  };
    function redirect(response) {
        if (response.status === 401) {
            document.cookie = 'au=;expires=Thu, 01 Jan 1970 00:00:00 GMT';
            window.location = '/login';
        }
    }

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
        last_updated: '2016-07-22T01:00:00Z'
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
            app.getTasks(app.tasks);
        } catch(e) {}
    } else {
        /* The user is using the app for the first time, or the user has not
        * saved any cities, so show the user some fake data. A real app in this
        * scenario could guess the user's location via IP lookup and then inject
        * that data into the page.
        */
        // app.updateTask(initialTask);
        app.tasks = [];
        app.saveTasks();
    }
    app.sync();
    app.checkDoneTasks();
})();

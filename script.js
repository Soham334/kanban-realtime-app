// ============== KANBAN BOARD APP - PRODUCTION READY ==============

function isFirebaseConfigValid(config) {
    if (!config) return false;
    const requiredKeys = ['apiKey', 'authDomain', 'projectId', 'appId'];
    return requiredKeys.every((key) => {
        const value = config[key];
        return typeof value === 'string' && value.trim() !== '' && !value.includes('YOUR_');
    });
}

class KanbanBoard {
    constructor() {
        this.tasks = {};
        this.columns = ['todo', 'inprogress', 'review', 'done'];
        this.columnNames = {
            todo: 'TO DO',
            inprogress: 'IN PROGRESS',
            review: 'REVIEW',
            done: 'DONE'
        };
        this.boardId = this.generateBoardId();
        this.settings = {
            boardName: 'Kanban Board',
            teamMembers: ['Coach A', 'Coach B', 'Coach C', 'Instructor'],
            wipLimits: { todo: 0, inprogress: 3, review: 2, done: 0 }
        };
        this.editingTaskId = null;
        this.newTaskColumn = null;
        this.firestore = null;
        this.boardDocRef = null;
        this.unsubscribeRealtime = null;
        this.isRealtimeEnabled = false;
        this.isApplyingRemoteUpdate = false;
        
        this.loadFromStorage();
        this.init();
        this.initializeRealtimeSync();
    }

    generateBoardId() {
        const hash = window.location.hash.substring(1);
        if (hash && hash.length === 8) return hash;
        const newId = Math.random().toString(16).substr(2, 8);
        window.location.hash = newId;
        return newId;
    }

    getStorageKey() {
        return `kanban_board_${this.boardId}`;
    }

    getSettingsKey() {
        return `kanban_settings_${this.boardId}`;
    }

    loadFromStorage() {
        const stored = localStorage.getItem(this.getStorageKey());
        if (stored) {
            try {
                this.tasks = JSON.parse(stored);
            } catch (e) {
                console.error('Error loading tasks:', e);
                this.createSampleTasks();
            }
        } else {
            this.createSampleTasks();
        }

        const settingsStored = localStorage.getItem(this.getSettingsKey());
        if (settingsStored) {
            try {
                this.settings = JSON.parse(settingsStored);
            } catch (e) {
                console.error('Error loading settings:', e);
            }
        }
    }

    saveLocalCacheOnly() {
        localStorage.setItem(this.getStorageKey(), JSON.stringify(this.tasks));
        localStorage.setItem(this.getSettingsKey(), JSON.stringify(this.settings));
    }

    saveToStorage() {
        this.saveLocalCacheOnly();

        if (!this.isRealtimeEnabled || this.isApplyingRemoteUpdate) return;
        this.pushBoardToFirestore();
    }

    async pushBoardToFirestore() {
        if (!this.boardDocRef) return;

        try {
            await this.boardDocRef.set({
                boardId: this.boardId,
                tasks: this.tasks,
                settings: this.settings,
                updatedAt: Date.now()
            }, { merge: true });
        } catch (error) {
            console.error('Error syncing board to Firestore:', error);
            this.showNotification('⚠️ Sync failed. Working locally.');
        }
    }

    initializeRealtimeSync() {
        const config = window.KANBAN_FIREBASE_CONFIG;

        if (!window.firebase || !window.firebase.firestore) {
            console.warn('Firebase SDK not loaded. Using local mode.');
            return;
        }

        if (!isFirebaseConfigValid(config)) {
            console.warn('Firebase config missing or invalid. Using local mode.');
            return;
        }

        try {
            const app = firebase.apps.length ? firebase.app() : firebase.initializeApp(config);
            this.firestore = firebase.firestore(app);
            this.boardDocRef = this.firestore.collection('kanbanBoards').doc(this.boardId);
            this.isRealtimeEnabled = true;

            this.unsubscribeRealtime = this.boardDocRef.onSnapshot((doc) => {
                if (!doc.exists) {
                    this.pushBoardToFirestore();
                    return;
                }

                const data = doc.data() || {};
                const remoteTasks = data.tasks || {};
                const remoteSettings = data.settings || {};

                const mergedSettings = {
                    boardName: remoteSettings.boardName || this.settings.boardName || 'Kanban Board',
                    teamMembers: Array.isArray(remoteSettings.teamMembers) && remoteSettings.teamMembers.length
                        ? remoteSettings.teamMembers
                        : this.settings.teamMembers,
                    wipLimits: {
                        ...this.settings.wipLimits,
                        ...(remoteSettings.wipLimits || {})
                    }
                };

                const hasTaskChanges = JSON.stringify(remoteTasks) !== JSON.stringify(this.tasks);
                const hasSettingsChanges = JSON.stringify(mergedSettings) !== JSON.stringify(this.settings);

                if (!hasTaskChanges && !hasSettingsChanges) return;

                this.isApplyingRemoteUpdate = true;
                this.tasks = remoteTasks;
                this.settings = mergedSettings;
                this.saveLocalCacheOnly();
                this.render();
                this.updateMetrics();

                const boardTitle = document.getElementById('boardTitle');
                if (boardTitle) boardTitle.textContent = this.settings.boardName.toUpperCase();

                this.isApplyingRemoteUpdate = false;
            }, (error) => {
                console.error('Realtime sync listener error:', error);
                this.showNotification('⚠️ Realtime sync disconnected.');
            });

            this.showNotification('✓ Realtime sync connected');
        } catch (error) {
            console.error('Error initializing Firestore sync:', error);
            this.isRealtimeEnabled = false;
        }
    }

    createSampleTasks() {
        const samples = [
            {
                id: 'task1',
                title: 'Check Homework - Batch A',
                description: 'Review and check homework submissions',
                column: 'todo',
                assignee: 'Coach A',
                priority: 'high',
                tags: ['homework', 'checking'],
                blocked: false,
                createdAt: Date.now() - 86400000 * 3
            },
            {
                id: 'task2',
                title: 'Checking Homework - Batch B',
                description: 'Review homework for second batch',
                column: 'inprogress',
                assignee: 'Coach B',
                priority: 'high',
                tags: ['homework', 'checking'],
                blocked: false,
                createdAt: Date.now() - 86400000 * 2
            },
            {
                id: 'task3',
                title: 'Prepare Test Paper (Math)',
                description: 'Create test paper for mathematics',
                column: 'todo',
                assignee: 'Coach A',
                priority: 'high',
                tags: ['test', 'math'],
                blocked: false,
                createdAt: Date.now() - 86400000 * 1
            },
            {
                id: 'task4',
                title: 'Evaluating Test - Batch A (Mr. Sharma)',
                description: 'Evaluate test results for batch A',
                column: 'inprogress',
                assignee: 'Coach B',
                priority: 'high',
                tags: ['evaluation', 'test'],
                blocked: false,
                createdAt: Date.now() - 43200000
            },
            {
                id: 'task5',
                title: 'Homework Checked - Batch C',
                description: 'Homework checking completed',
                column: 'done',
                assignee: 'Coach C',
                priority: 'medium',
                tags: ['homework', 'completed'],
                blocked: false,
                createdAt: Date.now() - 21600000
            },
            {
                id: 'task6',
                title: 'Solve Doubts - Physics (Student List)',
                description: 'Clear doubts for physics students',
                column: 'todo',
                assignee: 'Coach A',
                priority: 'high',
                tags: ['physics', 'doubts'],
                blocked: false,
                createdAt: Date.now()
            },
            {
                id: 'task7',
                title: 'Solving Doubts - 2 Students',
                description: 'Help 2 students with their questions',
                column: 'inprogress',
                assignee: 'Instructor',
                priority: 'medium',
                tags: ['doubts', 'tutoring'],
                blocked: false,
                createdAt: Date.now()
            }
        ];

        samples.forEach(task => {
            this.tasks[task.id] = task;
        });

        this.saveToStorage();
    }

    init() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initializeBoard());
        } else {
            this.initializeBoard();
        }
    }

    initializeBoard() {
        this.setupEventListeners();
        this.render();
        this.updateMetrics();
        const boardTitle = document.getElementById('boardTitle');
        if (boardTitle) boardTitle.textContent = this.settings.boardName.toUpperCase();
    }

    setupEventListeners() {
        // Header buttons
        const shareBtn = document.getElementById('shareBtn');
        const settingsBtn = document.getElementById('settingsBtn');
        const addTaskGlobalBtn = document.getElementById('addTaskGlobalBtn');
        
        if (shareBtn) shareBtn.addEventListener('click', (e) => {
            e.preventDefault();
            this.openShareModal();
        });
        if (settingsBtn) settingsBtn.addEventListener('click', (e) => {
            e.preventDefault();
            this.openSettingsModal();
        });
        if (addTaskGlobalBtn) addTaskGlobalBtn.addEventListener('click', (e) => {
            e.preventDefault();
            this.openAddTaskModal('todo');
        });

        // Share modal
        const copyLinkBtn = document.getElementById('copyLinkBtn');
        if (copyLinkBtn) copyLinkBtn.addEventListener('click', (e) => {
            e.preventDefault();
            this.copyShareLink();
        });

        // Settings modal
        const saveSettingsBtn = document.getElementById('saveSettingsBtn');
        if (saveSettingsBtn) saveSettingsBtn.addEventListener('click', (e) => {
            e.preventDefault();
            this.saveSettings();
        });

        // Edit task modal
        const saveTaskBtn = document.getElementById('saveTaskBtn');
        const deleteTaskBtn = document.getElementById('deleteTaskBtn');
        if (saveTaskBtn) saveTaskBtn.addEventListener('click', (e) => {
            e.preventDefault();
            this.saveEditedTask();
        });
        if (deleteTaskBtn) deleteTaskBtn.addEventListener('click', (e) => {
            e.preventDefault();
            this.deleteTask();
        });

        // Priority selector in edit modal
        document.querySelectorAll('#editTaskPriorityGroup .select-option').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                document.querySelectorAll('#editTaskPriorityGroup .select-option').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
            });
        });

        // Close modals on background click
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.remove('active');
                }
            });
        });
    }

    render() {
        const board = document.getElementById('board');
        if (!board) return;

        board.innerHTML = '';

        this.columns.forEach(columnId => {
            const column = this.createColumnElement(columnId);
            board.appendChild(column);
        });
    }

    createColumnElement(columnId) {
        const columnDiv = document.createElement('div');
        columnDiv.className = `column ${columnId}`;
        columnDiv.dataset.column = columnId;

        const columnTasks = Object.values(this.tasks).filter(t => t.column === columnId);
        const wipLimit = this.settings.wipLimits[columnId] || 0;
        const isAtLimit = wipLimit > 0 && columnTasks.length >= wipLimit;
        if (isAtLimit) {
            columnDiv.classList.add('column-full');
        }

        // Header
        const header = document.createElement('div');
        const columnTitleText = wipLimit > 0
            ? `${this.columnNames[columnId]} (${columnTasks.length} / ${wipLimit})`
            : `${this.columnNames[columnId]} (${columnTasks.length})`;
        header.className = 'column-header';
        header.innerHTML = `
            <div class="column-title">
                <div class="glow-dot"></div>
                ${columnTitleText}
            </div>
            ${wipLimit > 0 ? `<div class="wip-badge ${isAtLimit ? 'warning' : ''}">${columnTasks.length} / ${wipLimit}</div>` : ''}
        `;

        // Tasks Container
        const tasksContainer = document.createElement('div');
        tasksContainer.className = 'tasks';
        tasksContainer.dataset.column = columnId;

        columnTasks.forEach((task, index) => {
            const taskCard = this.createTaskCard(task);
            taskCard.style.animationDelay = `${index * 0.08}s`;
            tasksContainer.appendChild(taskCard);
        });

        // Add Task Button
        const addTaskForm = document.createElement('div');
        addTaskForm.className = 'add-task-form';
        const addBtn = document.createElement('button');
        addBtn.className = 'btn-add';
        addBtn.textContent = '+ ADD TASK';
        addBtn.addEventListener('click', (e) => {
            e.preventDefault();
            this.openAddTaskModal(columnId);
        });
        addTaskForm.appendChild(addBtn);

        columnDiv.appendChild(header);
        columnDiv.appendChild(tasksContainer);
        columnDiv.appendChild(addTaskForm);

        // Setup drag and drop
        this.setupDragAndDrop(tasksContainer);

        return columnDiv;
    }

    createTaskCard(task) {
        const card = document.createElement('div');
        card.className = `task-card ${task.blocked ? 'blocked' : ''}`;
        card.draggable = true;
        card.dataset.taskId = task.id;

        const priorityClass = `priority-${task.priority}`;
        const timeAgo = this.getTimeAgo(task.createdAt);

        let tagsHtml = '';
        if (task.tags && task.tags.length > 0) {
            tagsHtml = task.tags.map(tag => `<span class="tag">${tag}</span>`).join('');
        }

        const taskHeader = document.createElement('div');
        taskHeader.className = 'task-header';
        taskHeader.innerHTML = `
            <div class="task-title">${task.title}</div>
            <div class="priority-dot ${priorityClass}"></div>
        `;

        const taskMeta = document.createElement('div');
        taskMeta.className = 'task-meta';
        taskMeta.innerHTML = `
            <span class="assignee-badge">👤 ${task.assignee}</span>
            <span style="color: #666;">⏱️ ${timeAgo}</span>
        `;

        card.appendChild(taskHeader);
        card.appendChild(taskMeta);

        if (tagsHtml) {
            const tagsDiv = document.createElement('div');
            tagsDiv.style.cssText = 'display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 12px;';
            tagsDiv.innerHTML = tagsHtml;
            card.appendChild(tagsDiv);
        }

        // Task actions
        const actions = document.createElement('div');
        actions.className = 'task-actions';

        const blockBtn = document.createElement('button');
        blockBtn.className = `task-btn ${task.blocked ? 'blocked-btn active' : 'blocked-btn'}`;
        blockBtn.textContent = '🚫 BLOCK';
        blockBtn.addEventListener('click', (e) => {
            e.preventDefault();
            this.toggleBlocked(task.id);
        });

        const editBtn = document.createElement('button');
        editBtn.className = 'task-btn';
        editBtn.textContent = '✏️ EDIT';
        editBtn.addEventListener('click', (e) => {
            e.preventDefault();
            this.editTask(task.id);
        });

        actions.appendChild(blockBtn);
        actions.appendChild(editBtn);
        card.appendChild(actions);

        // Drag events
        card.addEventListener('dragstart', (e) => {
            card.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('taskId', task.id);
        });

        card.addEventListener('dragend', () => {
            card.classList.remove('dragging');
        });

        return card;
    }

    setupDragAndDrop(container) {
        container.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';

            const taskId = e.dataTransfer.getData('taskId');
            const targetColumn = container.dataset.column;
            const sourceColumn = this.tasks[taskId]?.column;
            const wipCheck = this.checkWIPLimit(targetColumn, taskId);

            if (taskId && sourceColumn && sourceColumn !== targetColumn && !wipCheck.allowed) {
                container.style.borderTop = '4px solid #d32f2f';
            } else {
                container.style.borderTop = '4px solid #ffd700';
            }
        });

        container.addEventListener('dragleave', () => {
            container.style.borderTop = '';
        });

        container.addEventListener('drop', (e) => {
            e.preventDefault();
            container.style.borderTop = '';
            const taskId = e.dataTransfer.getData('taskId');
            const newColumn = container.dataset.column;

            if (this.tasks[taskId]) {
                const wipCheck = this.checkWIPLimit(newColumn, taskId);
                if (!wipCheck.allowed) {
                    this.triggerWIPLimitFeedback(newColumn);
                    this.showNotification('WIP limit reached');
                    return;
                }

                this.tasks[taskId].column = newColumn;
                this.saveToStorage();
                this.render();
                this.updateMetrics();
                this.showNotification(`✓ Task moved to ${this.columnNames[newColumn]}`);
            }
        });
    }

    openAddTaskModal(columnId) {
        this.editingTaskId = null;
        this.newTaskColumn = columnId;

        // Clear form
        const titleInput = document.getElementById('editTaskTitle');
        const descInput = document.getElementById('editTaskDescription');
        const assigneeInput = document.getElementById('editTaskAssignee');
        const tagsInput = document.getElementById('editTaskTags');
        const deleteBtn = document.getElementById('deleteTaskBtn');

        if (titleInput) titleInput.value = '';
        if (descInput) descInput.value = '';
        if (assigneeInput) assigneeInput.value = '';
        if (tagsInput) tagsInput.value = '';
        if (deleteBtn) deleteBtn.style.display = 'none';

        // Clear priority selection
        document.querySelectorAll('#editTaskPriorityGroup .select-option').forEach(b => {
            b.classList.remove('active');
            if (b.dataset.priority === 'medium') b.classList.add('active');
        });

        const header = document.querySelector('#editTaskModal .modal-header');
        if (header) header.textContent = '➕ ADD NEW TASK';

        const modal = document.getElementById('editTaskModal');
        if (modal) modal.classList.add('active');
    }

    editTask(taskId) {
        const task = this.tasks[taskId];
        if (!task) return;

        this.editingTaskId = taskId;

        const titleInput = document.getElementById('editTaskTitle');
        const descInput = document.getElementById('editTaskDescription');
        const assigneeInput = document.getElementById('editTaskAssignee');
        const tagsInput = document.getElementById('editTaskTags');
        const deleteBtn = document.getElementById('deleteTaskBtn');

        if (titleInput) titleInput.value = task.title;
        if (descInput) descInput.value = task.description || '';
        if (assigneeInput) assigneeInput.value = task.assignee;
        if (tagsInput) tagsInput.value = (task.tags && task.tags.length) ? task.tags.join(', ') : '';
        if (deleteBtn) deleteBtn.style.display = 'block';

        document.querySelectorAll('#editTaskPriorityGroup .select-option').forEach(b => {
            b.classList.remove('active');
            if (b.dataset.priority === task.priority) b.classList.add('active');
        });

        const header = document.querySelector('#editTaskModal .modal-header');
        if (header) header.textContent = '✏️ EDIT TASK';

        const modal = document.getElementById('editTaskModal');
        if (modal) modal.classList.add('active');
    }

    saveEditedTask() {
        const titleInput = document.getElementById('editTaskTitle');
        const title = titleInput ? titleInput.value.trim() : '';

        if (!title) {
            this.showNotification('⚠️ Task title is required!');
            return;
        }

        const descInput = document.getElementById('editTaskDescription');
        const assigneeInput = document.getElementById('editTaskAssignee');
        const tagsInput = document.getElementById('editTaskTags');
        const description = descInput ? descInput.value.trim() : '';
        const assignee = assigneeInput ? assigneeInput.value.trim() || 'Unassigned' : 'Unassigned';
        const tags = tagsInput ? tagsInput.value.split(',').map(t => t.trim()).filter(t => t) : [];
        const priority = document.querySelector('#editTaskPriorityGroup .select-option.active')?.dataset.priority || 'medium';

        if (this.editingTaskId) {
            // Editing existing task
            const task = this.tasks[this.editingTaskId];
            task.title = title;
            task.description = description;
            task.assignee = assignee;
            task.tags = tags;
            task.priority = priority;
        } else {
            // Creating new task
            const newTaskId = `task_${Date.now()}`;
            this.tasks[newTaskId] = {
                id: newTaskId,
                title: title,
                description: description,
                column: this.newTaskColumn || 'todo',
                assignee: assignee,
                priority: priority,
                tags: tags,
                blocked: false,
                createdAt: Date.now()
            };

            const wipCheck = this.checkWIPLimit(this.tasks[newTaskId].column, newTaskId);
            if (!wipCheck.allowed) {
                delete this.tasks[newTaskId];
                this.triggerWIPLimitFeedback(this.newTaskColumn || 'todo');
                this.showNotification('WIP limit reached');
                return;
            }
        }

        this.saveToStorage();
        this.render();
        this.updateMetrics();
        this.closeModal('editTaskModal');
        this.showNotification('✓ Task saved successfully!');
    }

    deleteTask() {
        if (!this.editingTaskId) return;

        if (confirm('Are you sure you want to delete this task?')) {
            delete this.tasks[this.editingTaskId];
            this.saveToStorage();
            this.render();
            this.updateMetrics();
            this.closeModal('editTaskModal');
            this.showNotification('✓ Task deleted!');
        }
    }

    toggleBlocked(taskId) {
        if (!this.tasks[taskId]) return;
        
        this.tasks[taskId].blocked = !this.tasks[taskId].blocked;
        const status = this.tasks[taskId].blocked ? '🚫 BLOCKED' : '✓ UNBLOCKED';
        
        // Instant visual update
        const card = document.querySelector(`[data-task-id="${taskId}"]`);
        if (card) {
            if (this.tasks[taskId].blocked) {
                card.classList.add('blocked');
            } else {
                card.classList.remove('blocked');
            }
            
            // Update block button
            const blockBtn = card.querySelector('.blocked-btn');
            if (blockBtn) {
                if (this.tasks[taskId].blocked) {
                    blockBtn.classList.add('active');
                } else {
                    blockBtn.classList.remove('active');
                }
            }
        }
        
        // Save and update metrics (non-blocking)
        this.saveToStorage();
        this.updateMetrics();
        this.showNotification(`${status}`);
    }

    openShareModal() {
        this.updateShareLink();
        const modal = document.getElementById('shareModal');
        if (modal) modal.classList.add('active');
    }

    updateShareLink() {
        const link = `${window.location.origin}${window.location.pathname}#${this.boardId}`;
        const shareLinkInput = document.getElementById('shareLink');
        if (shareLinkInput) shareLinkInput.value = link;
    }

    copyShareLink() {
        const shareLinkInput = document.getElementById('shareLink');
        if (shareLinkInput) {
            shareLinkInput.select();
            document.execCommand('copy');
            this.showNotification('✓ Link copied to clipboard!');
        }
    }

    openSettingsModal() {
        const boardNameInput = document.getElementById('boardName');
        const teamMembersInput = document.getElementById('teamMembers');
        const wipToDo = document.getElementById('wipToDo');
        const wipInProgress = document.getElementById('wipInProgress');
        const wipReview = document.getElementById('wipReview');
        const wipDone = document.getElementById('wipDone');

        if (boardNameInput) boardNameInput.value = this.settings.boardName;
        if (teamMembersInput) teamMembersInput.value = this.settings.teamMembers.join(', ');
        if (wipToDo) wipToDo.value = this.settings.wipLimits.todo || 0;
        if (wipInProgress) wipInProgress.value = this.settings.wipLimits.inprogress || 3;
        if (wipReview) wipReview.value = this.settings.wipLimits.review || 2;
        if (wipDone) wipDone.value = this.settings.wipLimits.done || 0;

        const modal = document.getElementById('settingsModal');
        if (modal) modal.classList.add('active');
    }

    saveSettings() {
        const boardNameInput = document.getElementById('boardName');
        const teamMembersInput = document.getElementById('teamMembers');
        const wipToDo = document.getElementById('wipToDo');
        const wipInProgress = document.getElementById('wipInProgress');
        const wipReview = document.getElementById('wipReview');
        const wipDone = document.getElementById('wipDone');

        this.settings.boardName = boardNameInput ? boardNameInput.value.trim() || 'Team Kanban Board' : 'Team Kanban Board';
        this.settings.teamMembers = teamMembersInput ? teamMembersInput.value.split(',').map(m => m.trim()).filter(m => m) : [];
        this.settings.wipLimits = {
            todo: parseInt(wipToDo?.value) || 0,
            inprogress: parseInt(wipInProgress?.value) || 3,
            review: parseInt(wipReview?.value) || 2,
            done: parseInt(wipDone?.value) || 0
        };

        this.saveToStorage();
        const boardTitle = document.getElementById('boardTitle');
        if (boardTitle) boardTitle.textContent = this.settings.boardName.toUpperCase();
        this.render();
        this.setupEventListeners();
        this.closeModal('settingsModal');
        this.showNotification('✓ Settings saved!');
    }

    updateMetrics() {
        const allTasks = Object.values(this.tasks);
        const doneTasks = allTasks.filter(t => t.column === 'done').length;
        const inProgressTasks = allTasks.filter(t => t.column === 'inprogress').length;
        const blockedTasks = allTasks.filter(t => t.blocked).length;

        const totalTasksEl = document.getElementById('totalTasks');
        const inProgressEl = document.getElementById('inProgressCount');
        const blockedEl = document.getElementById('blockedCount');
        const completedEl = document.getElementById('completedCount');
        const totalBottomEl = document.getElementById('totalTasksBottom');
        const progressFillEl = document.getElementById('progressFill');

        if (totalTasksEl) totalTasksEl.textContent = allTasks.length;
        if (inProgressEl) inProgressEl.textContent = inProgressTasks;
        if (blockedEl) blockedEl.textContent = blockedTasks;
        if (completedEl) completedEl.textContent = doneTasks;
        if (totalBottomEl) totalBottomEl.textContent = allTasks.length;

        if (progressFillEl) {
            const progress = allTasks.length > 0 ? (doneTasks / allTasks.length) * 100 : 0;
            progressFillEl.style.width = `${progress}%`;
        }
    }

    getTimeAgo(timestamp) {
        const seconds = Math.floor((Date.now() - timestamp) / 1000);
        if (seconds < 60) return 'just now';
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}m ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h ago`;
        const days = Math.floor(hours / 24);
        return `${days}d ago`;
    }

    showNotification(message) {
        const notification = document.createElement('div');
        notification.className = 'copy-notification';
        notification.textContent = message;
        notification.style.cssText = 'position: fixed; bottom: 30px; right: 30px; background: #1a1a1a; color: white; padding: 16px 24px; border-radius: 0; font-weight: 600; font-size: 13px; letter-spacing: 0.5px; z-index: 2000; box-shadow: 0 12px 28px rgba(0, 0, 0, 0.2); animation: slide-in 0.4s ease-out;';
        document.body.appendChild(notification);
        
        setTimeout(() => notification.remove(), 3000);
    }

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) modal.classList.remove('active');
    }

    getColumnTaskCount(columnId, excludeTaskId = null) {
        return Object.values(this.tasks).filter((task) => {
            if (excludeTaskId && task.id === excludeTaskId) return false;
            return task.column === columnId;
        }).length;
    }

    checkWIPLimit(columnId, excludeTaskId = null) {
        const limit = this.settings.wipLimits[columnId] || 0;
        const count = this.getColumnTaskCount(columnId, excludeTaskId);

        if (limit === 0) {
            return { allowed: true, count, limit };
        }

        return {
            allowed: count < limit,
            count,
            limit
        };
    }

    triggerWIPLimitFeedback(columnId) {
        const column = document.querySelector(`.column[data-column="${columnId}"]`);
        if (!column) return;

        column.classList.remove('wip-limit-reached');
        column.classList.add('wip-limit-reached');

        setTimeout(() => {
            column.classList.remove('wip-limit-reached');
        }, 450);
    }
}

// Global close modal function
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('active');
}

// Initialize on page load
let kanban;
document.addEventListener('DOMContentLoaded', () => {
    kanban = new KanbanBoard();

});
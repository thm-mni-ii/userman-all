interface User {
  id: number;
  givenName: string;
  familyName: string;
  creationTime: string;
}

document.addEventListener("DOMContentLoaded", (): void => {
  //--- check, if user is already logged in (e.g. after refresh) -------------------------------------------------------
  checkLogin();

  //--- Form Eventhandlers -------------------------------------------------------
  document.getElementById("add-user-form")!.addEventListener("submit", async (event: SubmitEvent): Promise<void> => {
    event.preventDefault();
    const usernameEl: HTMLInputElement = document.getElementById("add-user-username") as HTMLInputElement;
    const passwordEl: HTMLInputElement = document.getElementById("add-user-password") as HTMLInputElement;
    const givenNameEl: HTMLInputElement = document.getElementById("add-user-given-name") as HTMLInputElement;
    const familyNameEl: HTMLInputElement = document.getElementById("add-user-family-name") as HTMLInputElement;
    const username: string = usernameEl.value;
    const password: string = passwordEl.value;
    const givenName: string = givenNameEl.value;
    const familyName: string = familyNameEl.value;

    // Check, if any given value is empty.
    // Don't allow creation of users without given name or family name.
    if (givenName.length == 0 || familyName.length == 0 || username.length == 0 || password.length == 0) {
      addMessage("The given name or family name is empty.");
      return;
    }

    // Send user data via http to server using the route /user
    const res: Response = await fetch('/users', {
      method: 'post',
      headers: {
        "Content-type": "application/json"
      },
      body: JSON.stringify({ givenName, familyName, username, password })
    });
    const data: any = await res.json();

    addMessage(data.message);

    // Update the html
    readUsers();

    // Clear the input fields
    usernameEl.value = "";
    passwordEl.value = "";
    givenNameEl.value = "";
    familyNameEl.value = "";
  });

  document.getElementById("edit-user-form")!.addEventListener("submit", async (event: SubmitEvent): Promise<void> => {
    event.preventDefault();
    let idEl: HTMLInputElement = document.getElementById("edit-user-id") as HTMLInputElement;
    let givenNameEl: HTMLInputElement = document.getElementById("edit-user-given-name") as HTMLInputElement;
    let familyNameEl: HTMLInputElement = document.getElementById("edit-user-family-name") as HTMLInputElement;

    // Read the user's id from the hidden field.
    let userId: number = parseInt(idEl.value);
    let givenName: string = givenNameEl.value;
    let familyName: string = familyNameEl.value;

    const res: Response = await fetch('/users/' + userId, {
      method: 'put',
      headers: {
        "Content-type": "application/json"
      },
      body: JSON.stringify({ givenName, familyName }),
    });
    const data: any = await res.json();
    addMessage(data.message);

    // Update the html
    readUsers();
  });

  document.getElementById("login-form")!.addEventListener("submit", async (event: SubmitEvent): Promise<void> => {
    event.preventDefault();
    const usernameInput: HTMLInputElement = document.getElementById('login-user-username-input') as HTMLInputElement;
    const passwordInput: HTMLInputElement = document.getElementById('login-user-password-input') as HTMLInputElement;

    const username: string = usernameInput.value;
    const password: string = passwordInput.value;

    const response: Response = await fetch('/login', {
        method: "POST",
        headers: {
          "Content-type": "application/json"
        },
        body: JSON.stringify({username, password}),
      }
    );

    if (response.status === 400 || response.status === 401) {
      const data: any = await response.json();
      addMessage(data.message);
    } else if (response.status === 200) {
      const data: any = await response.json();
      addMessage(data.message);
      showLoggedInStatus(data.user);
    } else {
      addMessage(`Unhandled response code (${response.status}).`);
    }
  });

  document.getElementById("logout-form")!.addEventListener("submit", async (event: SubmitEvent): Promise<void> => {
    event.preventDefault();
    await fetch('/logout', {
        method: "POST",
      }
    );
    showLoggedOutStatus();
  });
});

/**
 * Checks if user might be logged
 */
async function checkLogin(): Promise<void> {
  const response: Response = await fetch('/login', {
      method: "GET"
    }
  );
  if (response.status === 200) {
    const data: any = await response.json();
    showLoggedInStatus(data.user);
  }
}

/**
 * Gets and displays all users
 */
async function readUsers(): Promise<void> {
  const res: Response = await fetch('/users', {
      method: "GET"
    }
  );
  const data: any = await res.json();
  renderList(data.userList);
}

/**
 * Displays the logged in username
 */
function showLoggedInStatus(user: User): void {
  const username: HTMLElement = document.getElementById('current-user-username')!;
  username.textContent = `Hello ${user.givenName}`;

  const addUserForm: HTMLElement = document.getElementById('add-user-container')!;
  addUserForm.classList.remove("d-none"); // show content area

  const contentArea: HTMLElement = document.getElementById('user-list-container')!;
  contentArea.classList.remove("d-none"); // show content area

  const login: HTMLElement = document.getElementById('login-container')!;
  login.classList.add("d-none"); // hide login

  const logout: HTMLElement = document.getElementById('logout-container')!;
  logout.classList.remove("d-none"); // show logout

  (document.getElementById('login-form') as HTMLFormElement).reset();

  readUsers();
}

/**
 * Resets the site to the logged-out state.
 * Clears user list, shows login form, hides logout form-
 */
function showLoggedOutStatus(): void {
  const username: HTMLElement = document.getElementById('current-user-username')!;
  username.innerHTML = ``;

  const addUserForm: HTMLElement = document.getElementById('add-user-container')!;
  addUserForm.classList.add("d-none"); // hide content area

  const contentArea: HTMLElement = document.getElementById('user-list-container')!;
  contentArea.classList.add("d-none"); // hide content area

  const login: HTMLElement = document.getElementById('login-container')!;
  login.classList.remove("d-none"); // show login

  const logout: HTMLElement = document.getElementById('logout-container')!;
  logout.classList.add("d-none"); // hide logout

  (document.getElementById('add-user-form') as HTMLFormElement).reset();
}


/**
 * 1) Clears the user table.
 * 2) Adds all users to the table.
 */
function renderList(userList: User[]): void {
  let userListEl: HTMLElement = document.getElementById("user-list")!;

  // Remove all entries from the table
  userListEl.replaceChildren();

  for (let user of userList) {
    // The new table row
    let tr: HTMLTableRowElement = document.createElement("tr");

    // ID cell
    let tdId: HTMLTableCellElement = document.createElement("td");
    tdId.textContent = user.id.toString();

    // Given name cell
    let tdGivenName: HTMLTableCellElement = document.createElement("td");
    tdGivenName.textContent = user.givenName;

    // Family name cell
    let tdFamilyName: HTMLTableCellElement = document.createElement("td");
    tdFamilyName.textContent = user.familyName;

    // Creation date cell
    let tdDate: HTMLTableCellElement = document.createElement("td");
    tdDate.textContent = user.creationTime;

    // Buttons cell
    let tdButtons: HTMLTableCellElement = document.createElement("td");

    // Delete button
    let deleteButton: HTMLButtonElement = document.createElement("button");
    deleteButton.className = "btn btn-danger";
    deleteButton.addEventListener("click", async () => {
      const res: Response = await fetch('/users/' + user.id, {
        method: 'DELETE'
      });
      const data: any = await res.json();
      addMessage(data.message);
      readUsers();
    });

    // Delete button icon
    let deleteButtonIcon: HTMLElement = document.createElement("i");
    deleteButtonIcon.className = "bi bi-trash-fill";
    deleteButton.append(deleteButtonIcon);

    // Edit button
    let editButton: HTMLButtonElement = document.createElement("button");
    editButton.type = "button";
    editButton.className = "btn btn-primary ms-3";
    editButton.setAttribute("data-bs-toggle", "modal");
    editButton.setAttribute("data-bs-target", "#edit-user-modal");
    editButton.addEventListener("click", () => {
      fillEditModal(user);
    });

    // Edit button icon
    let editButtonIcon: HTMLElement = document.createElement("i");
    editButtonIcon.className = "bi bi-pen-fill";
    editButton.append(editButtonIcon);

    // Adds the buttons to the button cell
    tdButtons.append(deleteButton, editButton);

    // Add the cells to the table row
    tr.append(tdId, tdGivenName, tdFamilyName, tdDate, tdButtons);

    // Add the table row to the table
    userListEl.append(tr);
  }
}

/**
 * Fills the modal window with the given user's data.
 */
function fillEditModal(user: User): void {
  let idEl: HTMLInputElement = document.getElementById("edit-user-id") as HTMLInputElement;
  let givenNameEl: HTMLInputElement = document.getElementById("edit-user-given-name") as HTMLInputElement;
  let familyNameEl: HTMLInputElement = document.getElementById("edit-user-family-name") as HTMLInputElement;

  // Write the user's id into the hidden field.
  idEl.value = user.id.toString();

  // Write the user's data into the text fields.
  givenNameEl.value = user.givenName;
  familyNameEl.value = user.familyName;
}

/**
 * Creates a new alert message.
 */
function addMessage(message: string): void {
  const messagesEl: HTMLElement = document.getElementById('messages')!;

  // The alert element
  let alertEl: HTMLElement = document.createElement('div');
  alertEl.classList.add('alert', 'alert-warning', 'alert-dismissible', 'fade', 'show');
  alertEl.setAttribute('role', 'alert');
  alertEl.textContent = message;

  // Close button
  let buttonEl: HTMLElement = document.createElement("button");
  // btn-close changes the button into an 'X' icon.
  buttonEl.className = "btn-close";
  // data-bs-dismiss enables the button to automatically close the alert on click.
  buttonEl.setAttribute("data-bs-dismiss", "alert");

  // Add the close button to the alert.
  alertEl.appendChild(buttonEl);

  // Add message to DOM
  messagesEl.appendChild(alertEl);

  // Auto-remove message after 5 seconds (5000ms)
  setTimeout(() => {
    alertEl.remove()
  }, 5000);
}

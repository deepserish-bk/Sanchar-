import flet
import pexpect
from flet import (
    FontWeight,
    IconButton,
    icons,
    ButtonStyle,
    Checkbox,
    Column,
    ElevatedButton,
    FilePicker,
    FilePickerResultEvent,
    Page,
    Radio,
    RadioGroup,
    Row,
    Text,
    TextField,
    colors,
    RoundedRectangleBorder,
    ControlState,
    Container,
    margin,
)
import subprocess
import os
import time
import re


def main(page: Page):
    # Update window styling
    page.title = "Age Encryption"
    page.window.width = 600
    page.window.height = 800
    page.padding = 30
    page.bgcolor = "#1E1E1E"  # Dark background
    page.theme_mode = "dark"

    # Get absolute path to icon
    current_dir = os.path.dirname(os.path.abspath(__file__))
    icon_path = os.path.join(current_dir, "assets", "icon.png")

    # Try both PNG and ICO formats for maximum compatibility
    page.window.icon = icon_path
    page.window.icon_ico = icon_path  # Some platforms prefer ICO
    page.icon = icon_path  # This sets the taskbar icon

    # Variables to hold file paths
    input_file_path = ""
    output_file_path = ""
    identity_file_paths = []
    recipients_file_paths = []
    identity_files_encrypted = []

    x25519_key = ""

    def update_output_file_name():
        nonlocal input_file_path, output_file_path
        if input_file_path:
            base_name = os.path.basename(input_file_path)
            dir_name = os.path.dirname(input_file_path)
            if operation_group.value == 'encrypt':
                output_file_name = base_name + '.age'
            elif operation_group.value == 'decrypt':
                if base_name.endswith('.age'):
                    output_file_name = base_name[:-4]  # Remove '.age'
                else:
                    output_file_name = base_name + '.out'
            elif operation_group.value == 'keygen':
                output_file_name = 'key.txt'
            else:
                output_file_name = base_name + '.txt'

            output_file_path = os.path.join(dir_name, output_file_name)
            output_file.value = output_file_path
        else:
            output_file.value = ''
            output_file_path = ''

    def select_output_file_click(e: FilePickerResultEvent):
        nonlocal input_file_path
        nonlocal operation_group
        if passphrase_checkbox.value and operation_group.value == 'keygen':
            output_file_name = 'key.age'
            allowed_exts = ['age']
        elif operation_group.value == 'keygen':
            output_file_name = 'key.txt'
            allowed_exts = []
        elif input_file_path:
            base_name = os.path.basename(input_file_path)
            if operation_group.value == 'encrypt':
                output_file_name = base_name + '.age'
                allowed_exts = ['age']
            elif operation_group.value == 'decrypt':
                if base_name.endswith('.age'):
                    output_file_name = base_name[:-4]  # Remove '.age'
                else:
                    output_file_name = base_name + '.out'
                allowed_exts = []
            else:
                output_file_name = base_name + '.txt'
        else:
            output_file_name = 'output.age' if operation_group.value == 'encrypt' else 'output'
            allowed_exts = ['age'] if (operation_group.value == 'encrypt' or passphrase_checkbox.value) else []

        output_file_picker.save_file(
            file_name=output_file_name,
            allowed_extensions=allowed_exts
        )

    # Functions to handle file selections
    def select_input_file(e: FilePickerResultEvent):
        nonlocal input_file_path
        if e.files:
            input_file_path = e.files[0].path
            input_file.value = input_file_path
            update_output_file_name()
            page.update()

    def select_output_file(e: FilePickerResultEvent):
        nonlocal output_file_path
        if e.path:
            output_file_path = e.path
            output_file.value = output_file_path
            page.update()

    def select_identity_files(e: FilePickerResultEvent):
        nonlocal identity_file_paths
        nonlocal identity_files_encrypted
        identity_files_encrypted = []
        if e.files:
            identity_file_paths = [file.path for file in e.files]
            identity_files.value = ", ".join(identity_file_paths)
            for file in identity_file_paths:
                identity_files_encrypted.append(file.endswith('.age'))
            
            update_options()
            page.update()

    def select_recipients_files(e: FilePickerResultEvent):
        nonlocal recipients_file_paths
        nonlocal passphrase_checkbox
        if e.files:
            recipients_file_paths = [file.path for file in e.files]
            recipients_files.value = ", ".join(recipients_file_paths)
            
            update_options()
            page.update()

    # Function to toggle passphrase field visibility
    def passphrase_checkbox_changed(e):
        update_options()
        page.update()
    
    def copy_passphrase(e):
        page.set_clipboard(passphrase_field.value)
        page.show_snack_bar(flet.SnackBar(content=flet.Text("Passphrase copied to clipboard")))

    copy_button = IconButton(
        icon=icons.COPY,
        tooltip="Copy passphrase",
        on_click=copy_passphrase,
        visible=False,
    )

    passphrase_checkbox = Checkbox(
        label="Passphrase",
        on_change=passphrase_checkbox_changed,
    )

    # Command execution function

    def execute_command(e):
        nonlocal identity_files_encrypted
        cmd = []
        operation = operation_group.value
        
        ansi_escape = re.compile(r'\x1B[@-_][0-?]*[ -/]*[@-~]')
        
        # Add dialog definition
        password_value = ""
        
        def handle_password_dialog(prompt_text):
            nonlocal password_value
            password_field = TextField(
                label="Password",  # Simplified label
                password=True,
                can_reveal_password=True,
                width=300
            )
            
            def close_dialog(e):
                nonlocal password_value
                password_value = password_field.value
                dlg.open = False
                page.update()

            dlg = flet.AlertDialog(
                modal=True,
                title=flet.Text("Password Required"),
                content=flet.Column([
                    flet.Text(prompt_text),  # Prompt text above the password field
                    password_field
                ], width=400, height=100),  # Make the content area bigger
                actions=[
                    flet.TextButton("Cancel", on_click=lambda _: close_dialog(None)),
                    flet.TextButton("OK", on_click=close_dialog),
                ],
            )
            
            page.dialog = dlg
            dlg.open = True
            page.update()
            
            # Wait for dialog to close
            while dlg.open:
                time.sleep(0.1)
            
            return password_value

        if operation == "encrypt":
            cmd = ["age", "--encrypt"]
        elif operation == "decrypt":
            cmd = ["age", "--decrypt"]
        elif operation == "keygen":
            if not passphrase_checkbox.value:
                cmd = ["age-keygen"]
                if output_file_path:
                    cmd.extend(["-o", output_file_path])
                process = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
                stdout, stderr = process.communicate()
                stdout = ansi_escape.sub('', stdout)
                if process.returncode != 0:
                    page.show_snack_bar(flet.SnackBar(content=flet.Text(f"Error: {stderr}")))
                    return
                if output_file_path:
                    output_area.value = "Success!\n"
                elif not output_file_path:
                    output_area.value = stdout
                page.update()
                return
            else:
                # Fixed passphrase-protected keygen approach
                cmd = "age-keygen"
                if output_file_path:
                    output_path = output_file_path.replace("'", "'\\''")  # Properly escape single quotes
                    cmd += f" | age -p"
                    if armor_checkbox.value:
                        cmd += " -a"
                    cmd += f" -o '{output_path}'"  # Wrap path in single quotes without escaping spaces

                try:
                    # First ensure any existing child process is cleaned up
                        
                    child = pexpect.spawn('/bin/sh', ['-c', cmd], encoding='utf-8')
                    
                    # Wait for key generation output before proceeding
                    # child.expect("Public key: .*\r\n", timeout=5)
                    
                    # Now expect the passphrase prompt
                    child.expect("Enter passphrase.*:", timeout=5)
                    prompt_text = child.after  # This captures the actual prompt from age
                    password = handle_password_dialog(prompt_text)
                    if password:
                        child.sendline(password)
                        child.expect("Confirm passphrase.*")
                        confirm_prompt = child.after  # Capture the confirmation prompt
                        confirm_password = handle_password_dialog(confirm_prompt)
                        if confirm_password:
                            child.sendline(confirm_password)
                    else:
                        child.sendline('')

                    child.expect(pexpect.EOF)
                    output = child.before
                    stderr = child.after
                    
                    exit_status = child.wait()

                    # Remove ANSI escape codes from stdout
                    ansi_escape = re.compile(r'\x1B[@-_][0-?]*[ -/]*[@-~]')
                    stdout = ansi_escape.sub('', output)

                    if exit_status == 0:
                        match = re.search(r'age: using autogenerated passphrase \"(.*)\"', stdout)
                        if match:
                            generated_passphrase = match.group(1)
                            # passphrase_field.value = generated_passphrase
                        
                            # Display a minimalistic popup showing the generated passphrase
                            dlg = flet.AlertDialog(
                                title=flet.Text("Generated Passphrase"),
                                content=flet.Column([
                                    flet.Text(generated_passphrase),
                                    flet.ElevatedButton(
                                        "Copy",
                                        on_click=lambda _: page.set_clipboard(generated_passphrase)
                                    )
                                ]),
                                actions=[
                                    flet.TextButton("OK", on_click=lambda _: close_dialog())
                                ],
                            )
                            def close_dialog():
                                dlg.open = False
                                page.update()

                            page.overlay.append(dlg)
                            dlg.open = True
                            page.update()
                        else:
                            output_area.value = "Successfully generated encrypted identity file"
                    else:
                        output_area.value = f"Error (exit code {child.exitstatus}):\n{stdout}"
                        # output_area.value += "\n" + stderr
                        output_area.value += "\n" + "Command Executed:\n" + str(cmd)
                    
                    child.close(force=True)
                    
                except Exception as e:
                    output_area.value = f"Error: {str(e)}\nCommand: {cmd}"
                
                page.update()
                return


        # Handle options
        if armor_checkbox.value:
            if operation != "decrypt":
                cmd.append("--armor")

        if output_file_path:
            cmd.extend(["--output", output_file_path])

        if operation == 'encrypt':
            if passphrase_checkbox.value:
                cmd.append("--passphrase")
            elif recipient_key_field.value:
                recipients = recipient_key_field.value.split(",")
                for recipient in recipients:
                    cmd.extend(["--recipient", recipient.strip()])
            elif recipients_files.value:
                for path in recipients_file_paths:
                    cmd.extend(["--recipients-file", path])
            elif identity_files.value:
                for path in identity_file_paths:
                    cmd.extend(["--identity", path])

        if operation == 'decrypt':
            if identity_files.value:
                passphrase_checkbox.value = False
                for path in identity_file_paths:
                    cmd.extend(["--identity", path])
                page.update()
            else:
                passphrase_checkbox.value = True
                page.update()
            # elif passphrase_checkbox.value and not passphrase_field.value:
            #     output_area.value = "Error: Passphrase is required for decryption with passphrase."
            #     page.update()
            #     return

        if input_file_path:
            cmd.append(input_file_path)

        # Execute the command using pexpect
        try:            
            
            child = pexpect.spawn(cmd[0], cmd[1:], encoding='utf-8')
            num_passwords_needed_for_identity_files = sum(int(x) for x in identity_files_encrypted)
            
            if passphrase_checkbox.value:
                child.expect("Enter passphrase.*:")
                password = handle_password_dialog("Enter passphrase")
                if password:
                    child.sendline(password)
                    if operation != "decrypt":
                        child.expect("Confirm passphrase.*")
                        confirm_password = handle_password_dialog("Confirm passphrase")
                        if confirm_password:
                            child.sendline(confirm_password)
                else:
                    child.sendline('')
            elif num_passwords_needed_for_identity_files > 0:
                for i in range(num_passwords_needed_for_identity_files):
                    child.expect("Enter passphrase.*:")
                    prompt_text = child.after  # This captures the actual prompt from age
                    password = handle_password_dialog(prompt_text)
                    if password:
                        child.sendline(password)
                    else:
                        child.sendline('')

            child.expect(pexpect.EOF)
            child.wait()
            stdout = child.before
            stderr = child.after
            
            exit_status = child.exitstatus

            # Remove ANSI escape codes from stdout
            ansi_escape = re.compile(r'\x1B[@-_][0-?]*[ -/]*[@-~]')
            stdout = ansi_escape.sub('', stdout)

            if exit_status == 0:
                # Figure out if stdout has output i.e. was encrypt done without file output
                if operation == "encrypt" and not output_file_path:
                    output_area.value = stdout
                elif operation == "decrypt" and not output_file_path:
                    output_area.value = stdout
                elif operation == 'keygen' and not output_file_path:
                    output_area.value = stdout
                else:
                    output_area.value = "Done!\n"

                # if not passphrase_field.value:
                    # Parse the generated passphrase from output and populate passphrase_field
                match = re.search(r'age: using autogenerated passphrase \"(.*)\"', stdout)
                if match:
                    generated_passphrase = match.group(1)
                    # passphrase_field.value = generated_passphrase
                
                    # Display a minimalistic popup showing the generated passphrase
                    dlg = flet.AlertDialog(
                        title=flet.Text("Generated Passphrase"),
                        content=flet.Column([
                            flet.Text(generated_passphrase),
                            flet.ElevatedButton(
                                "Copy",
                                on_click=lambda _: page.set_clipboard(generated_passphrase)
                            )
                        ]),
                        actions=[
                            flet.TextButton("OK", on_click=lambda _: close_dialog())
                        ],
                    )
                    def close_dialog():
                        dlg.open = False
                        page.update()

                    page.overlay.append(dlg)
                    dlg.open = True
                    page.update()
                else:
                    output_area.value += "\nSuccessfully encrypted" if operation == "encrypt" else "\nSuccessfully decrypted"
            else:
                output_area.value = f"Error (exit code {child.exitstatus}):\n{stdout}"
                # output_area.value += "\n" + stderr
                output_area.value += "\n" + "Command Executed:\n" + str(cmd)
        except Exception as err:
            output_area.value = f"Error:\n{str(err)}"

        page.update()

    # File picker callbacks
    input_file_picker = FilePicker(on_result=select_input_file)
    output_file_picker = FilePicker(on_result=select_output_file)
    identity_files_picker = FilePicker(on_result=select_identity_files)
    recipients_files_picker = FilePicker(on_result=select_recipients_files)

    # Set allow_multiple property after instantiation
    identity_files_picker.allow_multiple = True
    recipients_files_picker.allow_multiple = True

    page.overlay.extend([
        input_file_picker,
        output_file_picker,
        identity_files_picker,
        recipients_files_picker,
    ])

    # Update button styling
    button_style = ButtonStyle(
        color={
            ControlState.DEFAULT: "#FFFFFF",
            ControlState.DISABLED: "#AAAAAA",  # Pale text when disabled
        },
        bgcolor={
            ControlState.DEFAULT: "#0A84FF",  # iOS/macOS blue
            ControlState.DISABLED: "#7FB5FF",  # Pale blue when disabled
        },
        shape={ControlState.DEFAULT: RoundedRectangleBorder(radius=8)},
        padding=12,
    )

    # Update text field styling
    input_file = TextField(
        label="Input File",
        read_only=True,
        expand=True,
        border_radius=8,
        border_color="#333333",
        focused_border_color="#0A84FF",
        text_size=14,
        bgcolor="#2D2D2D",  # Slightly lighter than background
    )

    select_input_button = ElevatedButton(
        text="Select Input",
        style=button_style,
        on_click=lambda _: input_file_picker.pick_files()
    )

    output_file = TextField(
        label="Output File", 
        read_only=True, 
        expand=True,
        border_radius=8,
        border_color="#333333",
        focused_border_color="#0A84FF",
        text_size=14,
        bgcolor="#2D2D2D",
    )

    select_output_button = ElevatedButton(
        text="Select Output File",
        style=button_style,
        on_click=select_output_file_click,
    )

    def pick_recipients_files(e: flet.FilePickerResultEvent):
        recipients_files_picker.pick_files(allow_multiple=True)
        update_options()

    def pick_identity_files(e: flet.FilePickerResultEvent):
        identity_files_picker.pick_files(allow_multiple=True)
        update_options()

    identity_files = TextField(
        label="Identity Files", 
        read_only=True, 
        expand=True,
        border_radius=8,
        border_color="#333333",
        focused_border_color="#0A84FF",
        text_size=14,
        bgcolor="#2D2D2D",
    )

    select_identity_button = ElevatedButton(
        text="Select Identity Files",
        style=button_style,
        on_click=pick_identity_files
    )

    recipients_files = TextField(
        label="Recipients Files", 
        read_only=True, 
        expand=True,
        border_radius=8,
        border_color="#333333",
        focused_border_color="#0A84FF",
        text_size=14,
        bgcolor="#2D2D2D",
    )

    select_recipients_button = ElevatedButton(
        text="Select Recipients Files",
        style=button_style,
        on_click=pick_recipients_files
    )



    recipient_key_field = TextField(
        label="Recipient Keys (comma-separated)",
        multiline=True,
        expand=True,
        border_radius=8,
        border_color="#333333",
        focused_border_color="#0A84FF",
        text_size=14,
        bgcolor="#2D2D2D",
    )

    def on_operation_change(e):
        update_output_file_name()
        output_area.value = ""
        if operation_group.value == "encrypt":
            recipient_key_field.disabled = False
            clear_recipient_keys_button.disabled = False
            recipients_files.disabled = False
            select_recipients_button.disabled = False
            clear_recipients_button.disabled = False
            identity_files.disabled = False
            select_identity_button.disabled = False
            clear_identity_button.disabled = False
            input_file.disabled = False
            select_input_button.disabled = False
            output_file.disabled = False
            select_output_button.disabled = False
            clear_output_button.disabled = False
            armor_checkbox.disabled = False
            passphrase_checkbox.disabled = False
        elif operation_group.value == "decrypt":
            recipient_key_field.disabled = True
            clear_recipient_keys_button.disabled = True
            recipients_files.disabled = True
            select_recipients_button.disabled = True
            clear_recipients_button.disabled = True
            identity_files.disabled = False
            select_identity_button.disabled = False
            clear_identity_button.disabled = False
            input_file.disabled = False
            select_input_button.disabled = False
            output_file.disabled = False
            select_output_button.disabled = False
            clear_output_button.disabled = False
            armor_checkbox.value = False
            armor_checkbox.disabled = True
            passphrase_checkbox.disabled = False
        elif operation_group.value == "keygen":
            recipient_key_field.disabled = True
            clear_recipient_keys_button.disabled = True
            recipients_files.disabled = True
            select_recipients_button.disabled = True
            clear_recipients_button.disabled = True
            identity_files.disabled = True
            select_identity_button.disabled = True
            clear_identity_button.disabled = True
            input_file.value = ""
            input_file.disabled = True
            select_input_button.disabled = True
            armor_checkbox.disabled = False
            passphrase_checkbox.disabled = False
        clear_recipient_keys()
        clear_identity_files()
        clear_recipients_files()
        page.update()

    # Move this section to after all UI elements are defined, 
    # just before the final page.add() call

    # Initialize the operation group
    operation_group = RadioGroup(
        value="encrypt",
        content=Row([
            Radio(value="encrypt", label="Encrypt"),
            Radio(value="decrypt", label="Decrypt"),
            Radio(value="keygen", label="Generate X25519 key pair"),
        ]),
        on_change=on_operation_change,
    )


    armor_checkbox = Checkbox(label="Armor (-a, --armor)")

    # Passphrase label
    passphrase_label = Text(
        "Passphrase",
        size=16,
        weight=FontWeight.BOLD,
        visible=False,
        # color=colors.BLACK
    )
    # Passphrase checkbox and field are defined earlier
    passphrase_field = TextField(
        label="Passphrase",
        password=True,
        multiline=True,
        visible=False,
        can_reveal_password=True,
        expand=True
    )
    execute_button = ElevatedButton(
        text="Execute",
        style=ButtonStyle(
            color={ControlState.DEFAULT: colors.WHITE},
            bgcolor={ControlState.DEFAULT: colors.BLUE},
            shape={
                ControlState.DEFAULT: RoundedRectangleBorder(
                    radius=5
                )
            }
        ),
        on_click=execute_command
    )

    output_area = TextField(
        label="Output",
        multiline=True,
        read_only=True,
        height=200,
        border_radius=8,
        border_color="#333333",
        focused_border_color="#0A84FF",
        text_size=14,
        bgcolor="#2D2D2D",
    )

    # Layout
    # Clear buttons and their callbacks
    clear_output_button = IconButton(
        icon=icons.CLEAR,
        tooltip="Clear Output File",
        on_click=lambda _: clear_output_file()
    )

    def clear_output_file():
        nonlocal output_file_path
        output_file_path = ""
        output_file.value = ""
        page.update()

    clear_identity_button = IconButton(
        icon=icons.CLEAR,
        tooltip="Clear Identity Files",
        on_click=lambda _: clear_identity_files()
    )

    def update_options():
        if operation_group.value == "encrypt":
            if recipient_key_field.value:
                recipients_files.value = ""
                recipients_files.disabled = True
                select_recipients_button.disabled = True
                clear_recipients_button.disabled = True
                
                identity_files.value = ""
                identity_files.disabled = True
                select_identity_button.disabled = True
                clear_identity_button.disabled = True

                passphrase_checkbox.value = False
                passphrase_checkbox.disabled = True

            elif recipients_files.value:
                recipient_key_field.value = ""
                recipient_key_field.disabled = True
                clear_recipient_keys_button.disabled = True

                identity_files.value = ""
                identity_files.disabled = True
                select_identity_button.disabled = True
                clear_identity_button.disabled = True

                passphrase_checkbox.value = False
                passphrase_checkbox.disabled = True
            
            elif identity_files.value:
                recipient_key_field.value = ""
                recipient_key_field.disabled = True
                clear_recipient_keys_button.disabled = True
                recipients_files.value = ""
                recipients_files.disabled = True
                select_recipients_button.disabled = True
                clear_recipients_button.disabled = True

                passphrase_checkbox.value = False
                passphrase_checkbox.disabled = True
            
            elif passphrase_checkbox.value:
                recipient_key_field.value = ""
                recipient_key_field.disabled = True
                clear_recipient_keys_button.disabled = True

                recipients_files.value = ""
                recipients_files.disabled = True
                select_recipients_button.disabled = True
                clear_recipients_button.disabled = True

                identity_files.value = ""
                identity_files.disabled = True
                select_identity_button.disabled = True
                clear_identity_button.disabled = True
            
            else:
                recipient_key_field.disabled = False
                clear_recipient_keys_button.disabled = False

                recipients_files.disabled = False
                select_recipients_button.disabled = False
                clear_recipients_button.disabled = False

                identity_files.disabled = False
                select_identity_button.disabled = False
                clear_identity_button.disabled = False
        elif operation_group.value == "decrypt":

            if identity_files.value:
                passphrase_checkbox.value = False
                passphrase_checkbox.disabled = True
            
            elif passphrase_checkbox.value:
                identity_files.value = ""
                identity_files.disabled = True
                select_identity_button.disabled = True
                clear_identity_button.disabled = True

            else:
                passphrase_checkbox.disabled = False
                identity_files.disabled = False
                select_identity_button.disabled = False
                clear_identity_button.disabled = False
        page.update()

    recipient_key_field.on_change = lambda e: update_options()

    def clear_recipient_keys():
        recipient_key_field.value = ""
        update_options()
        page.update()

    clear_recipient_keys_button = IconButton(
        icon=icons.CLEAR,
        tooltip="Clear Recipient Keys",
        on_click=lambda _: clear_recipient_keys()
    )

    def clear_identity_files():
        nonlocal identity_file_paths
        nonlocal identity_files_encrypted
        identity_file_paths = []
        identity_files.value = ""
        identity_files_encrypted = []
        update_options()
        page.update()

    clear_recipients_button = IconButton(
        icon=icons.CLEAR,
        tooltip="Clear Recipients Files",
        on_click=lambda _: clear_recipients_files()
    )

    def clear_recipients_files():
        nonlocal recipients_file_paths
        recipients_file_paths = []
        recipients_files.value = ""
        update_options()
        page.update()
    # Now call on_operation_change after all UI elements exist
    on_operation_change(None)

    # Layout
    page.add(
        Column([
            Text(
                "Age Encryption",
                size=32,
                weight=FontWeight.W_500,
                color="#FFFFFF",
            ),
            Container(
                content=operation_group,
                margin=margin.only(top=15, bottom=10),
            ),
            Row(
                [armor_checkbox, passphrase_checkbox],
                spacing=20,
            ),
            Container(
                content=Row([
                    Column([
                        passphrase_label,
                        Row([
                            passphrase_field,
                            copy_button
                        ], expand=True)
                    ], expand=True)
                ], expand=True),
                margin=flet.margin.only(bottom=5),
            ),
            # File selection rows with consistent spacing
            Container(
                content=Column([
                    Row([input_file, select_input_button], spacing=10),
                    Row([output_file, select_output_button, clear_output_button], spacing=10),
                    Row([recipient_key_field, clear_recipient_keys_button], spacing=10),
                    Row([recipients_files, select_recipients_button, clear_recipients_button], spacing=10),
                    Row([identity_files, select_identity_button, clear_identity_button], spacing=10),
                ], spacing=8),
                margin=flet.margin.only(bottom=10),
            ),
            Container(
                content=execute_button,
                margin=flet.margin.only(bottom=10),
            ),
            Container(
                content=output_area,
                expand=True,
            ),
        ], 
        spacing=10,
        scroll=True,
    ))

flet.app(target=main)

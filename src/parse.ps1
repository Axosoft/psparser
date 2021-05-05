$errors = $null;
[Management.Automation.PSParser]::Tokenize($args[0], [ref]$errors);
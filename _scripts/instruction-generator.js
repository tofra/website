
var Mustache = require('mustache');

module.exports = (function() {

    // JSON blobs:
    // input -- generated by the web UI
    // strings -- a table of [translatable, reusable] strings that can be edited separately from this JS
    os_map = {
        "Debian 7 (wheezy)" : {
             os: "debian",
             os_version: 7,
         },
         "Debian 8 (jessie)" : {
             os: "debian",
             os_version: 8,
         },
        "Debian testing/unstable" : {
             os: "debian",
             os_version: 9,
        },
        "Debian (other)" : {
            os: "debian",
            os_version: 0,
        },
        "Ubuntu 16.04 (xenial)" : {
            os: "ubuntu",
            os_version: 16.04
        },
        "Ubuntu 14.04 (trusty)" : {
            os: "ubuntu",
            os_version: 14.04
        },
        "Ubuntu (other)" : {
            os: "ububtu",
            os_version: 0
        },
        "Gentoo" : {
            os: "gentoo",
            os_version: 0
        },
        "CentOS/RHEL 6" : {
            os: "centos",
            os_version: 6
        },
        "CentOS/RHEL 7" : {
            os: "centos",
            os_version: 7
        },
        "FreeBSD 9" : {
            os: "bsd",
            os_version: 9
        },
        "FreeBSD 10" : {
            os: "bsd",
            os_version: 10
        },
        "Mac OS X" : {
            os: "macos",
            os_version: 10
        },
        "A generic Python environment" : {
            os: "python",
            os_version: 0
        }
    }
    known_webservers = ["apache", "nginx", "haproxy", "plesk"]
    usecases = ["automated", "manual", "developer"]

    out = "";

    iprint = function(s, dict={}) {
        dict.cmd = command;
        out = out + Mustache.render(s, dict);
        return out;
    }

    strings = {
        base_command: {
            packaged: "certbot",
            auto: "/path/to/certbot-auto"
        },

        dev_apache:
            "To run the client with apache you'll run as ususal with the --apache flag. This will use apache to complete the certificate challenge as well as editing your apache config to host that certificate. If you'd like to specify apache as just your authenticator or installer use the --authenticator or --installer flags. To find all of the apache commands run with --apache --help",

        jessie_backports_instructions:
            'Follow the instructions <a href="http://backports.debian.org/Instructions/">here</a> to enable the Jessie backports repo, if you have not already done so',

        dev_install:
            `Running the client in developer mode from your local tree is a little different than running <tt>letsencrypt-auto</tt>. To get set up, do these things once:

    <pre>
    git clone https://github.com/certbot/certbot
    cd cerbot
    ./certbot-auto-source/cerbot-auto --os-packages-only
    ./tools/venv.sh
    </pre>

    Then in each shell where you’re working on the client, do:

    <pre>source ./venv/bin/activate</pre>`,

        thirdparty_plugin_note: 'There is a <a href="https://letsencrypt.readthedocs.org/en/latest/using.html#plugins">third party plugin</a> that adds support for {{PLUGIN}}; it\'s not officially supported by the CertBot team yet, but may work for you!',
        manual:
            "certonly --non-interactive --webroot -w /var/www/example/ -d example.com,www.example.com -w /var/www/other -d other.example.net",
        packages: {
            debian: {
                apache : "certbot python-certbot-nginx",
                nginx : "certbot python-certbot-apache",
                other : "certbot"
            }
        }
    }

    command = strings.cb_cmd;  // default, but can be changed by print_cbauto_instructions


    print_help = function() {
        print_install_instructions()
        print_getting_started_instructions()
    }

    print_install_instructions = function() {
        if (input.usecase == "developer") {
            return strings.dev_install;
        }
        if (input.os == "debian" || input.os == "ubuntu") {
            return print_debian_install_instructions()
        }
        if (input.os == "python"){
            return print_pip_install_instructions()
        }
        if (input.os == "gentoo"){
            return print_gentoo_install_instructions()
        }
        if (input.os == "bsd"){
            return print_bsd_install_instructions()
        }
        if (input.os == "rhel" || input.os == "centos" || input.os == "fedora"){
            return print_rhel_install_instructions()
        }
        print_cbauto_instructions()
    }

    print_gentoo_install_instructions = function() {
        package_name = "certbot"
        if (input.webserver == "apache") {
            package_name = "certbot-apache"
            command = "certbot-apache"
        }
        return iprint("emerge " + package_name)
    }

    print_bsd_install_instructions = function() {
        return iprint("pkg install py27-letsencrypt")
    }

    print_rhel_install_instructions = function() {
        // from: https://digitz.org/blog/lets-encrypt-ssl-centos-7-setup/
        if (input.os == "centos") {
            setup = "yum install epel-release\n"
            if (input.os_version < 7) {
                setup += "rpm -ivh https://rhel6.iuscommunity.org/ius-release.rpm\n"
                setup += "yum --enablerepo=ius install git python27 python27-devel python27-pip python27-setuptools python27-virtualenv -y\n"
            }
            setup += "yum install git\n"
            return print_cbauto_instructions(setup)
        }
        else if (input.os == "rhel") {
            return print_cbauto_instructions()
        }
    }

    print_debian_install_instructions = function() {
        backport = "";
        if (input.os == "debian" && input.os_version <= 7) {
            return print_cbauto_instructions();
        }
        else if (input.os == "ubuntu" && input.os_version <= 15.10) {
            return print_cbauto_instructions();
        }
        else if (input.os == "debian" && input.os_version == 8) {
            iprint(strings.jessie_backports_instructions);
            backport = " -t jessie-backports "
        }
        return iprint("apt-get install " + backport + debian_packages())
    }

    debian_packages = function() {
        return strings["debian"][input.webserver];
    }

    print_cbauto_instructions = function(inp="") {
        iprint(inp + strings.cbauto_install);
        command = strings.cbauto_cmd;
    }

    print_getting_started_instructions = function() {
        if (input.usecase == "automated")
            print_automated_getting_started()
        else if (input.usecase == "manual")
            print_manual_getting_started()
        else if (input.usecase == "developer")
            print_developer_getting_started()
    }

    print_automated_getting_started = function() {
        if (input.webserver == "apache") {
            return iprint(strings.apache_automated);
        } else if (input.webserver == "haproxy" || input.webserver == "plesk") {
            iprint(strings.certonly_automated);
            iprint(strings.thirdparty_plugin_note, {plugin: input.webserver});
        } else {
            return iprint(strings.certonly_automated);
        }
    }

    print_manual_getting_started = function() {
        return iprint(strings.manual);
    }

    print_developer_getting_started = function() {
        if (input.webserver == "apache")
            return iprint(strings.dev_apache)
        else if (input.webserver == "nginx")
            return iprint(strings.dev)
        else
            return iprint(strings.dev)
    }

    return {
        print_help: print_help,
        os_map: os_map,
        known_webservers: known_webservers,
        usecases: usecases
    }
})()

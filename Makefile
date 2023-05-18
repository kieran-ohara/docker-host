vm/venv: vm/requirements.txt
	python3 -m venv $@
	$@/bin/pip install -r $<
	touch $@

vm: vm/venv vm/ansible/collections
	cd $@ && packer build .

vm/ansible/collections: vm/ansible/requirements.yml vm/venv
	vm/venv/bin/ansible-galaxy collection install -f --collections-path $@ -r $<
	touch $@

.PHONY: vm

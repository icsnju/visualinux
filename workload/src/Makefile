ifneq ($(DIR_BIN),)
    DIR_BIN := $(realpath _bin/)
endif
$(info DIR_BIN=$(DIR_BIN))

SUBDIRS := $(wildcard */)
BUILD_SUBDIRS := $(patsubst %,subdir-%,$(SUBDIRS))

build-all: build-dep $(BUILD_SUBDIRS)
build-dep:
	@mkdir -p ${DIR_BIN}
.PHONY: build-all build-dep

$(BUILD_SUBDIRS):
	$(MAKE) -C $(patsubst subdir-%,%,$@) DIR_BIN=$(DIR_BIN)/$(patsubst subdir-%,%,$@)
.PHONY: $(BUILD_SUBDIRS)
